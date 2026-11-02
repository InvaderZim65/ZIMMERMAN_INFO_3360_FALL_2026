// src/server/events.ts
// Server function for game event ingestion with idempotency handling.
// Uses the service-role client to bypass RLS (events table has no RLS yet).

import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { createServerClient } from '../lib/supabase/server'
import { getSupabaseServerClient } from '../lib/supabase.server'
import {
  validateGameEvent,
  buildIdempotencyKey,
  eventDataMatches,
} from '../lib/events/validate'

export type IngestEventResult =
  | { status: 201; data: Record<string, unknown> }
  | { status: 200; data: Record<string, unknown> }
  | { status: 400; errors: Array<{ field: string; message: string }> }
  | { status: 401; error: string }
  | { status: 409; error: string }
  | { status: 500; error: string }

export const ingestGameEvent = createServerFn({ method: 'POST' })
  .validator((input: unknown) => input)
  .handler(async ({ data: body }): Promise<IngestEventResult> => {
    // 1. Authenticate
    const request = getRequest()
    const cookie = request.headers.get('cookie') ?? ''
    const authClient = createServerClient(cookie)
    const {
      data: { session },
      error: sessionError,
    } = await authClient.auth.getSession()

    if (sessionError || !session) {
      return { status: 401, error: 'Unauthorized: no active session' }
    }

    // 2. Validate
    const validation = validateGameEvent(body)
    if (!validation.ok) {
      return { status: 400, errors: validation.errors }
    }

    const eventData = validation.data
    const idempotencyKey = buildIdempotencyKey(
      eventData.provider_id,
      eventData.provider_event_id,
    )

    // 3. Check for existing event with this idempotency key
    const supabase = getSupabaseServerClient()

    const { data: existing, error: lookupError } = await supabase
      .from('game_events')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()

    if (lookupError) {
      console.error('[events] Lookup error:', lookupError.message)
      return { status: 500, error: 'Database error during idempotency check' }
    }

    // 4. If existing, check for duplicate vs conflict
    if (existing) {
      const matches = eventDataMatches(eventData, {
        game_id: existing.game_id,
        event_type: existing.event_type,
        player_id: existing.player_id,
        period: existing.period,
        game_clock: existing.game_clock,
        details: existing.details as Record<string, unknown> | null,
      })

      if (matches) {
        return { status: 200, data: existing }
      }

      return {
        status: 409,
        error:
          'Idempotency conflict: key exists with different data',
      }
    }

    // 5. Insert new event
    const { data: created, error: insertError } = await supabase
      .from('game_events')
      .insert({
        idempotency_key: idempotencyKey,
        provider_id: eventData.provider_id,
        provider_event_id: eventData.provider_event_id,
        game_id: eventData.game_id,
        event_type: eventData.event_type,
        player_id: eventData.player_id,
        period: eventData.period,
        game_clock: eventData.game_clock,
        details: eventData.details ?? {},
        provider_timestamp: eventData.provider_timestamp,
      })
      .select()
      .single()

    if (insertError) {
      // Handle race condition: another request inserted between our check and insert
      if (insertError.code === '23505') {
        // unique_violation -- re-fetch and compare
        const { data: raceRow } = await supabase
          .from('game_events')
          .select('*')
          .eq('idempotency_key', idempotencyKey)
          .single()

        if (raceRow) {
          const raceMatches = eventDataMatches(eventData, {
            game_id: raceRow.game_id,
            event_type: raceRow.event_type,
            player_id: raceRow.player_id,
            period: raceRow.period,
            game_clock: raceRow.game_clock,
            details: raceRow.details as Record<string, unknown> | null,
          })

          if (raceMatches) {
            return { status: 200, data: raceRow }
          }
          return {
            status: 409,
            error: 'Idempotency conflict: key exists with different data',
          }
        }
      }

      console.error('[events] Insert error:', insertError.message)
      return { status: 500, error: 'Failed to store event' }
    }

    return { status: 201, data: created }
  })

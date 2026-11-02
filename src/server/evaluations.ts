// src/server/evaluations.ts
// Server function for evaluation form submission.
// Derives coach_id from the authenticated session -- never trusts client input.

import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { createServerClient } from '../lib/supabase/server'
import { getSupabaseServerClient } from '../lib/supabase.server'
import { validateEvaluation } from '../lib/events/validate'

export type SubmitEvaluationResult =
  | { status: 201; data: Record<string, unknown> }
  | { status: 400; errors: Array<{ field: string; message: string }> }
  | { status: 401; error: string }
  | { status: 500; error: string }

export const submitEvaluation = createServerFn({ method: 'POST' })
  .validator((input: unknown) => input)
  .handler(async ({ data: body }): Promise<SubmitEvaluationResult> => {
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

    const coachId = session.user.id

    // 2. Validate
    const validation = validateEvaluation(body)
    if (!validation.ok) {
      return { status: 400, errors: validation.errors }
    }

    const evalData = validation.data

    // 3. Insert evaluation
    const supabase = getSupabaseServerClient()

    const { data: created, error: insertError } = await supabase
      .from('evaluation_forms')
      .insert({
        game_id: evalData.game_id,
        coach_id: coachId,
        player_id: evalData.player_id,
        rating: evalData.rating,
        notes: evalData.notes,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[evaluations] Insert error:', insertError.message)
      return { status: 500, error: 'Failed to store evaluation' }
    }

    return { status: 201, data: created }
  })

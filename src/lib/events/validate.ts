// src/lib/events/validate.ts
// Server-side validation that returns field-level error objects.
// Example output: { errors: [{ field: "game_id", message: "game_id is required" }] }

import {
  type FieldError,
  type GameEventInput,
  type EvaluationInput,
  isNonEmptyString,
  isUuid,
  isIntegerInRange,
  isValidEventType,
  isIsoTimestamp,
  VALID_EVENT_TYPES,
} from './schema'

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: FieldError[] }

// ── Game Event Validation ────────────────────────────────────────────────

export function validateGameEvent(
  body: unknown,
): ValidationResult<GameEventInput> {
  const errors: FieldError[] = []

  if (!body || typeof body !== 'object') {
    return { ok: false, errors: [{ field: '_body', message: 'Request body must be a JSON object' }] }
  }

  const input = body as Record<string, unknown>

  // provider_id -- required non-empty string
  if (!isNonEmptyString(input.provider_id)) {
    errors.push({ field: 'provider_id', message: 'provider_id is required' })
  }

  // provider_event_id -- required non-empty string
  if (!isNonEmptyString(input.provider_event_id)) {
    errors.push({
      field: 'provider_event_id',
      message: 'provider_event_id is required',
    })
  }

  // game_id -- required UUID
  if (!isNonEmptyString(input.game_id)) {
    errors.push({ field: 'game_id', message: 'game_id is required' })
  } else if (!isUuid(input.game_id)) {
    errors.push({ field: 'game_id', message: 'game_id must be a valid UUID' })
  }

  // event_type -- required, must be one of the allowed values
  if (!isNonEmptyString(input.event_type)) {
    errors.push({ field: 'event_type', message: 'event_type is required' })
  } else if (!isValidEventType(input.event_type)) {
    errors.push({
      field: 'event_type',
      message: `event_type must be one of: ${VALID_EVENT_TYPES.join(', ')}`,
    })
  }

  // period -- required integer 1-4
  if (input.period === undefined || input.period === null) {
    errors.push({ field: 'period', message: 'period is required' })
  } else if (!isIntegerInRange(input.period, 1, 4)) {
    errors.push({
      field: 'period',
      message: 'period must be an integer between 1 and 4',
    })
  }

  // player_id -- optional, but if provided must be a UUID
  if (
    input.player_id !== undefined &&
    input.player_id !== null &&
    !isUuid(input.player_id)
  ) {
    errors.push({
      field: 'player_id',
      message: 'player_id must be a valid UUID',
    })
  }

  // game_clock -- optional string, no strict format enforced
  if (
    input.game_clock !== undefined &&
    input.game_clock !== null &&
    typeof input.game_clock !== 'string'
  ) {
    errors.push({
      field: 'game_clock',
      message: 'game_clock must be a string',
    })
  }

  // details -- optional, must be an object if provided
  if (
    input.details !== undefined &&
    input.details !== null &&
    typeof input.details !== 'object'
  ) {
    errors.push({ field: 'details', message: 'details must be a JSON object' })
  }

  // provider_timestamp -- optional, but if provided must be a parseable ISO timestamp
  if (
    input.provider_timestamp !== undefined &&
    input.provider_timestamp !== null
  ) {
    if (!isIsoTimestamp(input.provider_timestamp)) {
      errors.push({
        field: 'provider_timestamp',
        message: 'provider_timestamp must be a valid ISO 8601 timestamp',
      })
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    data: {
      provider_id: (input.provider_id as string).trim(),
      provider_event_id: (input.provider_event_id as string).trim(),
      game_id: (input.game_id as string).trim(),
      event_type: input.event_type as string,
      player_id: input.player_id ? (input.player_id as string).trim() : null,
      period: input.period as number,
      game_clock: input.game_clock
        ? (input.game_clock as string).trim()
        : null,
      details: (input.details as Record<string, unknown>) ?? null,
      provider_timestamp: input.provider_timestamp
        ? (input.provider_timestamp as string)
        : null,
    },
  }
}

// ── Evaluation Form Validation ───────────────────────────────────────────

export function validateEvaluation(
  body: unknown,
): ValidationResult<EvaluationInput> {
  const errors: FieldError[] = []

  if (!body || typeof body !== 'object') {
    return { ok: false, errors: [{ field: '_body', message: 'Request body must be a JSON object' }] }
  }

  const input = body as Record<string, unknown>

  // game_id -- required UUID
  if (!isNonEmptyString(input.game_id)) {
    errors.push({ field: 'game_id', message: 'game_id is required' })
  } else if (!isUuid(input.game_id)) {
    errors.push({ field: 'game_id', message: 'game_id must be a valid UUID' })
  }

  // player_id -- required UUID
  if (!isNonEmptyString(input.player_id)) {
    errors.push({ field: 'player_id', message: 'player_id is required' })
  } else if (!isUuid(input.player_id)) {
    errors.push({
      field: 'player_id',
      message: 'player_id must be a valid UUID',
    })
  }

  // rating -- required integer 1-5
  if (input.rating === undefined || input.rating === null) {
    errors.push({ field: 'rating', message: 'rating is required' })
  } else if (!isIntegerInRange(input.rating, 1, 5)) {
    errors.push({
      field: 'rating',
      message: 'rating must be an integer between 1 and 5',
    })
  }

  // notes -- optional string
  if (
    input.notes !== undefined &&
    input.notes !== null &&
    typeof input.notes !== 'string'
  ) {
    errors.push({ field: 'notes', message: 'notes must be a string' })
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    data: {
      game_id: (input.game_id as string).trim(),
      player_id: (input.player_id as string).trim(),
      rating: input.rating as number,
      notes: input.notes ? (input.notes as string).trim() : null,
    },
  }
}

// ── Idempotency Key Builder ──────────────────────────────────────────────

export function buildIdempotencyKey(
  providerId: string,
  providerEventId: string,
): string {
  return `${providerId}:${providerEventId}`
}

// ── Data-Match Check (for idempotent replay detection) ───────────────────

/**
 * Compares the incoming event data against the existing stored row.
 * Returns true if the meaningful fields match (excludes timestamps).
 */
export function eventDataMatches(
  incoming: GameEventInput,
  existing: {
    game_id: string
    event_type: string
    player_id: string | null
    period: number
    game_clock: string | null
    details: Record<string, unknown> | null
  },
): boolean {
  if (incoming.game_id !== existing.game_id) return false
  if (incoming.event_type !== existing.event_type) return false
  if ((incoming.player_id ?? null) !== (existing.player_id ?? null))
    return false
  if (incoming.period !== existing.period) return false
  if ((incoming.game_clock ?? null) !== (existing.game_clock ?? null))
    return false

  // Compare details as JSON strings for deep equality
  const incomingDetails = JSON.stringify(incoming.details ?? {})
  const existingDetails = JSON.stringify(existing.details ?? {})
  if (incomingDetails !== existingDetails) return false

  return true
}

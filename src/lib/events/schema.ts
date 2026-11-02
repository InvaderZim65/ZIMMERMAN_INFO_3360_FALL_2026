// src/lib/events/schema.ts
// Manual validation schemas for game events and evaluation forms.
// No external validation library (zod, yup, etc.) -- pure TypeScript.

// ── Types ────────────────────────────────────────────────────────────────

export type GameEventInput = {
  provider_id: string
  provider_event_id: string
  game_id: string
  event_type: string
  player_id?: string | null
  period: number
  game_clock?: string | null
  details?: Record<string, unknown> | null
  provider_timestamp?: string | null
}

export type EvaluationInput = {
  game_id: string
  player_id: string
  rating: number
  notes?: string | null
}

export type FieldError = {
  field: string
  message: string
}

// ── Constants ────────────────────────────────────────────────────────────

export const VALID_EVENT_TYPES = [
  'goal',
  'assist',
  'penalty',
  'save',
  'shot',
] as const

export type EventType = (typeof VALID_EVENT_TYPES)[number]

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ── Helpers ──────────────────────────────────────────────────────────────

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_REGEX.test(value)
}

export function isIntegerInRange(
  value: unknown,
  min: number,
  max: number,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  )
}

export function isValidEventType(value: unknown): value is EventType {
  return (
    typeof value === 'string' &&
    (VALID_EVENT_TYPES as readonly string[]).includes(value)
  )
}

export function isIsoTimestamp(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const d = new Date(value)
  return !isNaN(d.getTime())
}

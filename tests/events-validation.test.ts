// tests/events-validation.test.ts
// Unit tests for game event and evaluation validation + idempotency logic.
// These are pure-function tests -- no database, no network.

import { describe, it, expect } from 'vitest'
import {
  validateGameEvent,
  validateEvaluation,
  buildIdempotencyKey,
  eventDataMatches,
} from '../src/lib/events/validate'
import {
  isNonEmptyString,
  isUuid,
  isIntegerInRange,
  isValidEventType,
  isIsoTimestamp,
} from '../src/lib/events/schema'

// ── Helper Assertions ────────────────────────────────────────────────────

describe('schema helpers', () => {
  describe('isNonEmptyString', () => {
    it('accepts a normal string', () => {
      expect(isNonEmptyString('hello')).toBe(true)
    })
    it('rejects empty string', () => {
      expect(isNonEmptyString('')).toBe(false)
    })
    it('rejects whitespace-only string', () => {
      expect(isNonEmptyString('   ')).toBe(false)
    })
    it('rejects non-string types', () => {
      expect(isNonEmptyString(123)).toBe(false)
      expect(isNonEmptyString(null)).toBe(false)
      expect(isNonEmptyString(undefined)).toBe(false)
    })
  })

  describe('isUuid', () => {
    it('accepts a valid v4 UUID', () => {
      expect(isUuid('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(true)
    })
    it('rejects a short string', () => {
      expect(isUuid('not-a-uuid')).toBe(false)
    })
    it('rejects a number', () => {
      expect(isUuid(12345)).toBe(false)
    })
  })

  describe('isIntegerInRange', () => {
    it('accepts integers within range', () => {
      expect(isIntegerInRange(1, 1, 4)).toBe(true)
      expect(isIntegerInRange(4, 1, 4)).toBe(true)
      expect(isIntegerInRange(3, 1, 5)).toBe(true)
    })
    it('rejects out of range', () => {
      expect(isIntegerInRange(0, 1, 4)).toBe(false)
      expect(isIntegerInRange(5, 1, 4)).toBe(false)
    })
    it('rejects floats', () => {
      expect(isIntegerInRange(2.5, 1, 4)).toBe(false)
    })
    it('rejects non-numbers', () => {
      expect(isIntegerInRange('3' as unknown as number, 1, 4)).toBe(false)
    })
  })

  describe('isValidEventType', () => {
    it('accepts all valid types', () => {
      expect(isValidEventType('goal')).toBe(true)
      expect(isValidEventType('assist')).toBe(true)
      expect(isValidEventType('penalty')).toBe(true)
      expect(isValidEventType('save')).toBe(true)
      expect(isValidEventType('shot')).toBe(true)
    })
    it('rejects invalid types', () => {
      expect(isValidEventType('touchdown')).toBe(false)
      expect(isValidEventType('')).toBe(false)
    })
  })

  describe('isIsoTimestamp', () => {
    it('accepts valid ISO strings', () => {
      expect(isIsoTimestamp('2026-11-02T10:30:00Z')).toBe(true)
      expect(isIsoTimestamp('2026-11-02T10:30:00.000Z')).toBe(true)
    })
    it('rejects garbage strings', () => {
      expect(isIsoTimestamp('not-a-date')).toBe(false)
    })
    it('rejects non-strings', () => {
      expect(isIsoTimestamp(12345)).toBe(false)
    })
  })
})

// ── Game Event Validation ────────────────────────────────────────────────

const VALID_GAME_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const VALID_PLAYER_ID = 'b2c3d4e5-f6a7-8901-bcde-f12345678901'

function validEventPayload() {
  return {
    provider_id: 'arena-tracker-1',
    provider_event_id: 'evt-001',
    game_id: VALID_GAME_ID,
    event_type: 'goal',
    period: 2,
    player_id: VALID_PLAYER_ID,
    game_clock: '14:22',
  }
}

describe('validateGameEvent', () => {
  it('accepts a fully valid event', () => {
    const result = validateGameEvent(validEventPayload())
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.provider_id).toBe('arena-tracker-1')
      expect(result.data.event_type).toBe('goal')
      expect(result.data.period).toBe(2)
    }
  })

  it('accepts an event without optional fields', () => {
    const result = validateGameEvent({
      provider_id: 'tracker',
      provider_event_id: 'e1',
      game_id: VALID_GAME_ID,
      event_type: 'shot',
      period: 1,
    })
    expect(result.ok).toBe(true)
  })

  it('returns errors for missing required fields', () => {
    const result = validateGameEvent({})
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const fields = result.errors.map((e) => e.field)
      expect(fields).toContain('provider_id')
      expect(fields).toContain('provider_event_id')
      expect(fields).toContain('game_id')
      expect(fields).toContain('event_type')
      expect(fields).toContain('period')
    }
  })

  it('returns error for non-object body', () => {
    const result = validateGameEvent('not an object')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors[0].field).toBe('_body')
    }
  })

  it('returns error for invalid game_id format', () => {
    const result = validateGameEvent({
      ...validEventPayload(),
      game_id: 'not-a-uuid',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const gameIdError = result.errors.find((e) => e.field === 'game_id')
      expect(gameIdError).toBeDefined()
      expect(gameIdError!.message).toContain('UUID')
    }
  })

  it('returns error for invalid event_type', () => {
    const result = validateGameEvent({
      ...validEventPayload(),
      event_type: 'touchdown',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const typeError = result.errors.find((e) => e.field === 'event_type')
      expect(typeError).toBeDefined()
      expect(typeError!.message).toContain('must be one of')
    }
  })

  it('returns error for period out of range', () => {
    const result = validateGameEvent({
      ...validEventPayload(),
      period: 5,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const periodError = result.errors.find((e) => e.field === 'period')
      expect(periodError).toBeDefined()
    }
  })

  it('returns error for period = 0', () => {
    const result = validateGameEvent({
      ...validEventPayload(),
      period: 0,
    })
    expect(result.ok).toBe(false)
  })

  it('accepts period = 4 (overtime)', () => {
    const result = validateGameEvent({
      ...validEventPayload(),
      period: 4,
    })
    expect(result.ok).toBe(true)
  })

  it('returns error for invalid player_id when provided', () => {
    const result = validateGameEvent({
      ...validEventPayload(),
      player_id: 'bad-uuid',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.find((e) => e.field === 'player_id')).toBeDefined()
    }
  })

  it('accepts null player_id', () => {
    const result = validateGameEvent({
      ...validEventPayload(),
      player_id: null,
    })
    expect(result.ok).toBe(true)
  })

  it('returns error for invalid provider_timestamp', () => {
    const result = validateGameEvent({
      ...validEventPayload(),
      provider_timestamp: 'not-a-timestamp',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(
        result.errors.find((e) => e.field === 'provider_timestamp'),
      ).toBeDefined()
    }
  })

  it('accepts valid provider_timestamp', () => {
    const result = validateGameEvent({
      ...validEventPayload(),
      provider_timestamp: '2026-11-02T20:15:00Z',
    })
    expect(result.ok).toBe(true)
  })

  it('trims whitespace from string fields', () => {
    const result = validateGameEvent({
      ...validEventPayload(),
      provider_id: '  arena-tracker-1  ',
      provider_event_id: '  evt-001  ',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.provider_id).toBe('arena-tracker-1')
      expect(result.data.provider_event_id).toBe('evt-001')
    }
  })
})

// ── Evaluation Validation ────────────────────────────────────────────────

function validEvaluationPayload() {
  return {
    game_id: VALID_GAME_ID,
    player_id: VALID_PLAYER_ID,
    rating: 4,
    notes: 'Strong defensive play in the third period.',
  }
}

describe('validateEvaluation', () => {
  it('accepts a fully valid evaluation', () => {
    const result = validateEvaluation(validEvaluationPayload())
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.rating).toBe(4)
      expect(result.data.game_id).toBe(VALID_GAME_ID)
    }
  })

  it('accepts evaluation without notes', () => {
    const { notes, ...noNotes } = validEvaluationPayload()
    const result = validateEvaluation(noNotes)
    expect(result.ok).toBe(true)
  })

  it('returns errors for missing required fields', () => {
    const result = validateEvaluation({})
    expect(result.ok).toBe(false)
    if (!result.ok) {
      const fields = result.errors.map((e) => e.field)
      expect(fields).toContain('game_id')
      expect(fields).toContain('player_id')
      expect(fields).toContain('rating')
    }
  })

  it('returns error for rating below 1', () => {
    const result = validateEvaluation({
      ...validEvaluationPayload(),
      rating: 0,
    })
    expect(result.ok).toBe(false)
  })

  it('returns error for rating above 5', () => {
    const result = validateEvaluation({
      ...validEvaluationPayload(),
      rating: 6,
    })
    expect(result.ok).toBe(false)
  })

  it('returns error for float rating', () => {
    const result = validateEvaluation({
      ...validEvaluationPayload(),
      rating: 3.5,
    })
    expect(result.ok).toBe(false)
  })

  it('returns error for non-object body', () => {
    const result = validateEvaluation(null)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors[0].field).toBe('_body')
    }
  })

  it('returns error for invalid game_id', () => {
    const result = validateEvaluation({
      ...validEvaluationPayload(),
      game_id: 'bad',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.find((e) => e.field === 'game_id')).toBeDefined()
    }
  })

  it('returns error for non-string notes', () => {
    const result = validateEvaluation({
      ...validEvaluationPayload(),
      notes: 123,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.find((e) => e.field === 'notes')).toBeDefined()
    }
  })
})

// ── Idempotency Key ─────────────────────────────────────────────────────

describe('buildIdempotencyKey', () => {
  it('joins provider_id and provider_event_id with colon', () => {
    expect(buildIdempotencyKey('tracker-1', 'evt-42')).toBe('tracker-1:evt-42')
  })

  it('handles empty strings gracefully', () => {
    expect(buildIdempotencyKey('', '')).toBe(':')
  })
})

// ── Data Match Check ────────────────────────────────────────────────────

describe('eventDataMatches', () => {
  const baseIncoming = {
    provider_id: 'tracker',
    provider_event_id: 'e1',
    game_id: VALID_GAME_ID,
    event_type: 'goal',
    player_id: VALID_PLAYER_ID,
    period: 2,
    game_clock: '12:34',
    details: { zone: 'offensive' },
    provider_timestamp: null,
  }

  const baseExisting = {
    game_id: VALID_GAME_ID,
    event_type: 'goal',
    player_id: VALID_PLAYER_ID,
    period: 2,
    game_clock: '12:34',
    details: { zone: 'offensive' },
  }

  it('returns true when all compared fields match', () => {
    expect(eventDataMatches(baseIncoming, baseExisting)).toBe(true)
  })

  it('returns false when game_id differs', () => {
    expect(
      eventDataMatches(baseIncoming, {
        ...baseExisting,
        game_id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
      }),
    ).toBe(false)
  })

  it('returns false when event_type differs', () => {
    expect(
      eventDataMatches(baseIncoming, {
        ...baseExisting,
        event_type: 'assist',
      }),
    ).toBe(false)
  })

  it('returns false when period differs', () => {
    expect(
      eventDataMatches(baseIncoming, { ...baseExisting, period: 3 }),
    ).toBe(false)
  })

  it('returns false when player_id differs', () => {
    expect(
      eventDataMatches(baseIncoming, {
        ...baseExisting,
        player_id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
      }),
    ).toBe(false)
  })

  it('returns false when details differ', () => {
    expect(
      eventDataMatches(baseIncoming, {
        ...baseExisting,
        details: { zone: 'defensive' },
      }),
    ).toBe(false)
  })

  it('handles null player_id on both sides', () => {
    expect(
      eventDataMatches(
        { ...baseIncoming, player_id: null },
        { ...baseExisting, player_id: null },
      ),
    ).toBe(true)
  })

  it('handles null game_clock on both sides', () => {
    expect(
      eventDataMatches(
        { ...baseIncoming, game_clock: null },
        { ...baseExisting, game_clock: null },
      ),
    ).toBe(true)
  })

  it('handles null details on both sides (defaults to empty object comparison)', () => {
    expect(
      eventDataMatches(
        { ...baseIncoming, details: null },
        { ...baseExisting, details: null },
      ),
    ).toBe(true)
  })
})

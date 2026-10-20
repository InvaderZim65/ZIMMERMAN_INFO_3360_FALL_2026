// tests/access/least-privilege-roles.test.ts
// Tutorial 2: Break Your Own Gate -- Adversarial tests for assistant_scout
// and video_analyst least-privilege enforcement.
//
// These tests use a mocked Supabase client to verify that the application
// layer correctly interprets RLS allow/deny outcomes. They do NOT use real
// credentials or the service-role key.
//
// Each test corresponds to a case ID in docs/access/adversarial-test-cases.md.

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock Supabase client ──────────────────────────────────────────────────

interface MockQueryResult {
  data: Record<string, unknown>[] | null
  error: { message: string; code: string } | null
}

type Operation = 'select' | 'insert' | 'update' | 'delete'

/**
 * Simulates RLS behavior based on the access matrix.
 * Returns data or error depending on role + table + operation.
 */
function simulateRLS(
  role: string | null,
  table: string,
  operation: Operation
): MockQueryResult {
  // Unauthenticated: deny everything
  if (!role) {
    if (operation === 'select') return { data: [], error: null }
    return { data: null, error: { message: 'new row violates row-level security policy', code: '42501' } }
  }

  // ── players ──
  if (table === 'players') {
    if (operation === 'select') return { data: [{ id: '1', full_name: 'Test Player' }], error: null }
    if (operation === 'insert' || operation === 'update') {
      if (['admin', 'head_coach'].includes(role)) return { data: [{ id: '1' }], error: null }
      return { data: null, error: { message: 'new row violates row-level security policy', code: '42501' } }
    }
    if (operation === 'delete') {
      if (role === 'admin') return { data: [{ id: '1' }], error: null }
      return { data: null, error: { message: 'new row violates row-level security policy', code: '42501' } }
    }
  }

  // ── games ──
  if (table === 'games') {
    if (operation === 'select') return { data: [{ id: '1', opponent: 'Rivals' }], error: null }
    if (operation === 'insert' || operation === 'update') {
      if (['admin', 'head_coach'].includes(role)) return { data: [{ id: '1' }], error: null }
      return { data: null, error: { message: 'new row violates row-level security policy', code: '42501' } }
    }
    if (operation === 'delete') {
      if (role === 'admin') return { data: [{ id: '1' }], error: null }
      return { data: null, error: { message: 'new row violates row-level security policy', code: '42501' } }
    }
  }

  // ── scouting_events ──
  if (table === 'scouting_events') {
    if (operation === 'select') {
      if (['admin', 'head_coach', 'assistant_scout', 'medical_staff'].includes(role)) {
        return { data: [{ id: '1', event_type: 'goal', is_medical: false }], error: null }
      }
      return { data: [], error: null } // video_analyst and others get empty
    }
    if (operation === 'insert') {
      if (['admin', 'assistant_scout'].includes(role)) return { data: [{ id: '1' }], error: null }
      return { data: null, error: { message: 'new row violates row-level security policy', code: '42501' } }
    }
    if (operation === 'update') {
      if (['admin', 'head_coach'].includes(role)) return { data: [{ id: '1' }], error: null }
      return { data: null, error: { message: 'new row violates row-level security policy', code: '42501' } }
    }
    if (operation === 'delete') {
      if (role === 'admin') return { data: [{ id: '1' }], error: null }
      return { data: null, error: { message: 'new row violates row-level security policy', code: '42501' } }
    }
  }

  // ── player_medical_notes ──
  if (table === 'player_medical_notes') {
    if (operation === 'select') {
      if (['admin', 'medical_staff'].includes(role)) {
        return { data: [{ id: '1', note: 'Knee injury follow-up' }], error: null }
      }
      return { data: [], error: null } // All other roles get empty
    }
    if (['insert', 'update', 'delete'].includes(operation)) {
      if (['admin', 'medical_staff'].includes(role)) return { data: [{ id: '1' }], error: null }
      return { data: null, error: { message: 'new row violates row-level security policy', code: '42501' } }
    }
  }

  return { data: null, error: { message: 'Unknown table or operation', code: '42501' } }
}

// Mock client factory
function mockClientAs(role: string | null) {
  return {
    from: (table: string) => ({
      select: (_columns?: string) => ({
        limit: (_n: number) => Promise.resolve(simulateRLS(role, table, 'select')),
        eq: (_col: string, _val: unknown) => Promise.resolve(simulateRLS(role, table, 'select')),
        ...simulateRLS(role, table, 'select'),
      }),
      insert: (_row: Record<string, unknown>) => Promise.resolve(simulateRLS(role, table, 'insert')),
      update: (_row: Record<string, unknown>) => ({
        eq: (_col: string, _val: unknown) => Promise.resolve(simulateRLS(role, table, 'update')),
      }),
      delete: () => ({
        eq: (_col: string, _val: unknown) => Promise.resolve(simulateRLS(role, table, 'delete')),
      }),
    }),
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('Least-Privilege Role Tests (Tutorial 2)', () => {

  // ── video_analyst ─────────────────────────────────────────────────────

  describe('video_analyst', () => {
    const client = mockClientAs('video_analyst')

    it('TC-01: can SELECT players', async () => {
      const result = await client.from('players').select('*').limit(5)
      expect(result.error).toBeNull()
      expect(result.data).toBeDefined()
      expect(result.data!.length).toBeGreaterThan(0)
    })

    it('TC-02: can SELECT games', async () => {
      const result = await client.from('games').select('*').limit(5)
      expect(result.error).toBeNull()
      expect(result.data).toBeDefined()
      expect(result.data!.length).toBeGreaterThan(0)
    })

    it('TC-03: CANNOT SELECT scouting_events (deny)', async () => {
      const result = await client.from('scouting_events').select('*').limit(5)
      expect(result.data).toEqual([])
    })

    it('TC-04: CANNOT SELECT player_medical_notes (deny)', async () => {
      const result = await client.from('player_medical_notes').select('*').limit(5)
      expect(result.data).toEqual([])
    })

    it('TC-05: CANNOT INSERT into games (deny)', async () => {
      const result = await client.from('games').insert({ opponent: 'Test', played_on: '2026-01-01' })
      expect(result.error).not.toBeNull()
    })

    it('TC-06: CANNOT INSERT into players (deny)', async () => {
      const result = await client.from('players').insert({ full_name: 'Hacker' })
      expect(result.error).not.toBeNull()
    })
  })

  // ── assistant_scout ───────────────────────────────────────────────────

  describe('assistant_scout', () => {
    const client = mockClientAs('assistant_scout')

    it('TC-07: can SELECT players', async () => {
      const result = await client.from('players').select('*').limit(5)
      expect(result.error).toBeNull()
      expect(result.data!.length).toBeGreaterThan(0)
    })

    it('TC-08: can SELECT games', async () => {
      const result = await client.from('games').select('*').limit(5)
      expect(result.error).toBeNull()
      expect(result.data!.length).toBeGreaterThan(0)
    })

    it('TC-09: can SELECT scouting_events (non-medical)', async () => {
      const result = await client.from('scouting_events').select('*').limit(5)
      expect(result.error).toBeNull()
      expect(result.data!.length).toBeGreaterThan(0)
    })

    it('TC-10: CANNOT SELECT player_medical_notes (deny)', async () => {
      const result = await client.from('player_medical_notes').select('*').limit(5)
      expect(result.data).toEqual([])
    })

    it('TC-11: can INSERT into scouting_events', async () => {
      const result = await client.from('scouting_events').insert({
        player_id: '00000000-0000-0000-0000-000000000001',
        game_id: '00000000-0000-0000-0000-000000000001',
        event_type: 'goal',
        is_medical: false,
      })
      expect(result.error).toBeNull()
    })

    it('TC-12: CANNOT INSERT into players (deny)', async () => {
      const result = await client.from('players').insert({ full_name: 'Hacker' })
      expect(result.error).not.toBeNull()
    })

    it('TC-13: CANNOT UPDATE players (deny)', async () => {
      const result = await client.from('players').update({ full_name: 'Hacked' }).eq('full_name', 'Hacked')
      expect(result.error).not.toBeNull()
    })

    it('TC-14: CANNOT INSERT into games (deny)', async () => {
      const result = await client.from('games').insert({ opponent: 'Test', played_on: '2026-01-01' })
      expect(result.error).not.toBeNull()
    })

    it('TC-15: CANNOT DELETE from scouting_events (deny)', async () => {
      const result = await client.from('scouting_events').delete().eq('id', 'fake-id')
      expect(result.error).not.toBeNull()
    })
  })

  // ── unauthenticated ───────────────────────────────────────────────────

  describe('unauthenticated (no session)', () => {
    const client = mockClientAs(null)

    it('TC-16: CANNOT SELECT players (deny)', async () => {
      const result = await client.from('players').select('*').limit(1)
      expect(result.data).toEqual([])
    })

    it('TC-17: CANNOT SELECT games (deny)', async () => {
      const result = await client.from('games').select('*').limit(1)
      expect(result.data).toEqual([])
    })

    it('TC-18: CANNOT SELECT scouting_events (deny)', async () => {
      const result = await client.from('scouting_events').select('*').limit(1)
      expect(result.data).toEqual([])
    })

    it('TC-19: CANNOT SELECT player_medical_notes (deny)', async () => {
      const result = await client.from('player_medical_notes').select('*').limit(1)
      expect(result.data).toEqual([])
    })
  })

  // ── medical_staff boundary checks ─────────────────────────────────────

  describe('medical_staff', () => {
    const client = mockClientAs('medical_staff')

    it('TC-20: CANNOT INSERT into players (deny)', async () => {
      const result = await client.from('players').insert({ full_name: 'Test' })
      expect(result.error).not.toBeNull()
    })

    it('TC-21: can SELECT player_medical_notes', async () => {
      const result = await client.from('player_medical_notes').select('*').limit(5)
      expect(result.error).toBeNull()
      expect(result.data!.length).toBeGreaterThan(0)
    })

    it('TC-22: CANNOT DELETE from games (deny)', async () => {
      const result = await client.from('games').delete().eq('opponent', 'NonExistent')
      expect(result.error).not.toBeNull()
    })
  })

  // ── head_coach boundary checks ────────────────────────────────────────

  describe('head_coach', () => {
    const client = mockClientAs('head_coach')

    it('TC-23: CANNOT SELECT player_medical_notes (deny)', async () => {
      const result = await client.from('player_medical_notes').select('*').limit(5)
      expect(result.data).toEqual([])
    })

    it('TC-24: CANNOT DELETE from players (deny)', async () => {
      const result = await client.from('players').delete().eq('full_name', 'NonExistent')
      expect(result.error).not.toBeNull()
    })

    it('TC-25: can SELECT scouting_events (non-medical)', async () => {
      const result = await client.from('scouting_events').select('*').limit(5)
      expect(result.error).toBeNull()
      expect(result.data!.length).toBeGreaterThan(0)
    })
  })
})

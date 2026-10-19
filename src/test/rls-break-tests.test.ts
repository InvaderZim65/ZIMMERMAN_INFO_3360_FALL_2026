// src/test/rls-break-tests.test.ts
// RLS break tests -- prove that Supabase Row Level Security correctly denies
// or allows operations based on the caller's app_metadata.role.
//
// Prerequisites:
//   1. Run `npm run setup:test-users` to create the five test accounts.
//   2. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.
//
// Execute: npx vitest run src/test/rls-break-tests.test.ts

import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''
const SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? ''
const PASSWORD = 'TestPass123!'

function anonClient() {
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  })
}

async function clientAs(email: string) {
  const client = anonClient()
  const { error } = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  })
  if (error) throw new Error(`Sign-in failed for ${email}: ${error.message}`)
  return client
}

// ── video_analyst ───────────────────────────────────────────────────────

describe('RLS Break Tests', () => {
  describe('video_analyst role', () => {
    it('can read players', async () => {
      const client = await clientAs('analyst@test.hockey')
      const { data, error } = await client.from('players').select('*').limit(5)
      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    it('can read games', async () => {
      const client = await clientAs('analyst@test.hockey')
      const { data, error } = await client.from('games').select('*').limit(5)
      expect(error).toBeNull()
    })

    it('CANNOT read scouting_events', async () => {
      const client = await clientAs('analyst@test.hockey')
      const { data } = await client
        .from('scouting_events')
        .select('*')
        .limit(5)
      // RLS returns empty set, not an error
      expect(data).toEqual([])
    })

    it('CANNOT read player_medical_notes', async () => {
      const client = await clientAs('analyst@test.hockey')
      const { data } = await client
        .from('player_medical_notes')
        .select('*')
        .limit(5)
      expect(data).toEqual([])
    })

    it('CANNOT insert into games', async () => {
      const client = await clientAs('analyst@test.hockey')
      const { error } = await client.from('games').insert({
        opponent: 'Test Team',
        played_on: '2026-01-01',
      })
      expect(error).not.toBeNull()
    })
  })

  // ── assistant_scout ─────────────────────────────────────────────────────

  describe('assistant_scout role', () => {
    it('can read scouting_events', async () => {
      const client = await clientAs('scout@test.hockey')
      const { data, error } = await client
        .from('scouting_events')
        .select('*')
        .limit(5)
      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    it('CANNOT read player_medical_notes', async () => {
      const client = await clientAs('scout@test.hockey')
      const { data } = await client
        .from('player_medical_notes')
        .select('*')
        .limit(5)
      expect(data).toEqual([])
    })

    it('CANNOT insert into games', async () => {
      const client = await clientAs('scout@test.hockey')
      const { error } = await client.from('games').insert({
        opponent: 'Test',
        played_on: '2026-01-01',
      })
      expect(error).not.toBeNull()
    })

    it('CANNOT update players', async () => {
      const client = await clientAs('scout@test.hockey')
      const { error } = await client
        .from('players')
        .update({ full_name: 'Hacked' })
        .eq('full_name', 'Hacked')
      expect(error).not.toBeNull()
    })
  })

  // ── medical_staff ───────────────────────────────────────────────────────

  describe('medical_staff role', () => {
    it('can read player_medical_notes', async () => {
      const client = await clientAs('medical@test.hockey')
      const { data, error } = await client
        .from('player_medical_notes')
        .select('*')
        .limit(5)
      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    it('can read medical scouting events', async () => {
      const client = await clientAs('medical@test.hockey')
      const { data, error } = await client
        .from('scouting_events')
        .select('*')
        .limit(5)
      expect(error).toBeNull()
    })

    it('CANNOT insert into players', async () => {
      const client = await clientAs('medical@test.hockey')
      const { error } = await client
        .from('players')
        .insert({ full_name: 'Test Player' })
      expect(error).not.toBeNull()
    })

    it('CANNOT delete games', async () => {
      const client = await clientAs('medical@test.hockey')
      const { error } = await client
        .from('games')
        .delete()
        .eq('opponent', 'NonExistent')
      expect(error).not.toBeNull()
    })
  })

  // ── head_coach ──────────────────────────────────────────────────────────

  describe('head_coach role', () => {
    it('can read scouting_events (non-medical)', async () => {
      const client = await clientAs('coach@test.hockey')
      const { data, error } = await client
        .from('scouting_events')
        .select('*')
        .limit(5)
      expect(error).toBeNull()
    })

    it('CANNOT read player_medical_notes', async () => {
      const client = await clientAs('coach@test.hockey')
      const { data } = await client
        .from('player_medical_notes')
        .select('*')
        .limit(5)
      expect(data).toEqual([])
    })

    it('CANNOT delete players', async () => {
      const client = await clientAs('coach@test.hockey')
      const { error } = await client
        .from('players')
        .delete()
        .eq('full_name', 'NonExistent')
      expect(error).not.toBeNull()
    })
  })

  // ── unauthenticated (no session) ───────────────────────────────────────

  describe('unauthenticated (no session)', () => {
    it('CANNOT read any table', async () => {
      const client = anonClient()
      const { data: players } = await client
        .from('players')
        .select('*')
        .limit(1)
      const { data: games } = await client
        .from('games')
        .select('*')
        .limit(1)
      expect(players).toEqual([])
      expect(games).toEqual([])
    })
  })
})

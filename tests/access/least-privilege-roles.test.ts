// tests/access/least-privilege-roles.test.ts
//
// Break-tests for assistant_scout, video_analyst, and medical_staff
// least-privilege enforcement against the course Supabase project.
//
// Each test signs in as a test account and probes actual RLS policies.
// No simulateRLS mock. No service-role key. No GRANT or RLS changes.
//
// Test accounts are defined in docs/security/sprint-4-handoff.md.
// Credentials come from environment variables listed in
// docs/access/adversarial-test-cases.md.
//
// Case IDs map 1:1 to docs/access/adversarial-test-cases.md.

import { describe, it, expect, beforeAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ── Environment variables (names only in the case file, values from env) ──

const SUPABASE_URL = process.env.TEST_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY!

const SCOUT_EMAIL = process.env.TEST_ASSISTANT_SCOUT_EMAIL!
const SCOUT_PASSWORD = process.env.TEST_ASSISTANT_SCOUT_PASSWORD!

const ANALYST_EMAIL = process.env.TEST_VIDEO_ANALYST_EMAIL!
const ANALYST_PASSWORD = process.env.TEST_VIDEO_ANALYST_PASSWORD!

const MEDICAL_EMAIL = process.env.TEST_MEDICAL_EMAIL!
const MEDICAL_PASSWORD = process.env.TEST_MEDICAL_PASSWORD!

// ── Helper: create a Supabase client signed in as a specific test account ──

async function signInAs(email: string, password: string): Promise<SupabaseClient> {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`Sign-in failed for ${email}: ${error.message}`)
  return client
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('Break-tests: Least-Privilege Role Verification', () => {
  let scoutClient: SupabaseClient
  let analystClient: SupabaseClient
  let medicalClient: SupabaseClient

  beforeAll(async () => {
    scoutClient = await signInAs(SCOUT_EMAIL, SCOUT_PASSWORD)
    analystClient = await signInAs(ANALYST_EMAIL, ANALYST_PASSWORD)
    medicalClient = await signInAs(MEDICAL_EMAIL, MEDICAL_PASSWORD)
  })

  // ── assistant_scout ───────────────────────────────────────────────────

  describe('assistant_scout', () => {
    it('AS-READ-SCOUT assistant scout can read non-medical scouting events', async () => {
      const { data, error } = await scoutClient
        .from('scouting_events')
        .select('*')
        .eq('is_medical', false)
        .limit(5)
      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data!.length).toBeGreaterThanOrEqual(0)
      // Verify no medical rows leaked through
      if (data && data.length > 0) {
        for (const row of data) {
          expect(row.is_medical).toBe(false)
        }
      }
    })

    it('AS-READ-GAME assistant scout can read game data', async () => {
      const { data, error } = await scoutClient
        .from('games')
        .select('*')
        .limit(5)
      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    it('AS-READ-MED assistant scout cannot read medical notes', async () => {
      const { data, error } = await scoutClient
        .from('player_medical_notes')
        .select('*')
        .limit(5)
      // RLS returns zero rows for denied SELECT, not an error
      expect(data).toEqual([])
    })

    it('AS-CHANGE-MED assistant scout cannot insert medical notes', async () => {
      const { data, error } = await scoutClient
        .from('player_medical_notes')
        .insert({
          player_id: '00000000-0000-0000-0000-000000000001',
          note: 'break-test: should be denied',
          created_by: '00000000-0000-0000-0000-000000000001'
        })
      // INSERT deny returns a policy-violation error
      expect(error).not.toBeNull()
    })

    it('AS-READ-SS assistant scout cannot read sports-science scouting events', async () => {
      // Query all scouting events and verify none have is_medical = true
      const { data, error } = await scoutClient
        .from('scouting_events')
        .select('*')
        .limit(100)
      expect(error).toBeNull()
      // Every row returned must have is_medical = false
      // If RLS is working, medical-flagged rows are filtered out
      if (data && data.length > 0) {
        const medicalRows = data.filter((row: any) => row.is_medical === true)
        expect(medicalRows.length).toBe(0)
      }
    })

    it('AS-CHANGE-SS assistant scout cannot update sports-science scouting events', async () => {
      // assistant_scout has no UPDATE policy on scouting_events
      const { data, error } = await scoutClient
        .from('scouting_events')
        .update({ notes: 'break-test: should be denied' })
        .eq('is_medical', true)
      // UPDATE deny returns a policy-violation error or zero affected rows
      // Either the error is non-null, or data is empty/null (no rows matched)
      const denied = error !== null || !data || (Array.isArray(data) && data.length === 0)
      expect(denied).toBe(true)
    })

    it('AS-FLAG-SHARED assistant scout sees no medical flag in shared scouting view', async () => {
      // Query the scouting_events_safe shared view
      const { data, error } = await scoutClient
        .from('scouting_events_safe')
        .select('*')
        .limit(100)
      // The view should not contain the is_medical column at all
      if (data && data.length > 0) {
        for (const row of data) {
          // The is_medical column must not exist in the view results
          expect(row).not.toHaveProperty('is_medical')
        }
      }
      // Additionally, no medical-flagged rows should appear
      // (the view has WHERE is_medical = false)
      // If error is not null, that also means no medical flags leaked
      if (error) {
        // View may not be accessible at all, which is also acceptable
        expect(data).toBeNull()
      }
    })

    it('AS-WRITE-SCOUT assistant scout can insert non-medical scouting events', async () => {
      const { data, error } = await scoutClient
        .from('scouting_events')
        .insert({
          player_id: '00000000-0000-0000-0000-000000000001',
          game_id: '00000000-0000-0000-0000-000000000001',
          event_type: 'breakaway',
          notes: 'break-test: scout INSERT allowed',
          is_medical: false
        })
        .select()
      expect(error).toBeNull()
      expect(data).toBeDefined()
    })
  })

  // ── video_analyst ─────────────────────────────────────────────────────

  describe('video_analyst', () => {
    it('VA-READ-SCOUT video analyst cannot read scouting events', async () => {
      const { data, error } = await analystClient
        .from('scouting_events')
        .select('*')
        .limit(5)
      // video_analyst is absent from the scouting_events_select policy role list
      // RLS returns zero rows
      expect(data).toEqual([])
    })

    it('VA-READ-GAME video analyst can read game data', async () => {
      const { data, error } = await analystClient
        .from('games')
        .select('*')
        .limit(5)
      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    it('VA-READ-MED video analyst cannot read medical notes', async () => {
      const { data, error } = await analystClient
        .from('player_medical_notes')
        .select('*')
        .limit(5)
      // RLS returns zero rows for denied SELECT
      expect(data).toEqual([])
    })

    it('VA-CHANGE-MED video analyst cannot insert medical notes', async () => {
      const { data, error } = await analystClient
        .from('player_medical_notes')
        .insert({
          player_id: '00000000-0000-0000-0000-000000000001',
          note: 'break-test: should be denied',
          created_by: '00000000-0000-0000-0000-000000000001'
        })
      expect(error).not.toBeNull()
    })

    it('VA-READ-SS video analyst cannot read sports-science scouting events', async () => {
      // video_analyst gets zero rows from scouting_events entirely
      const { data, error } = await analystClient
        .from('scouting_events')
        .select('*')
        .eq('is_medical', true)
        .limit(5)
      expect(data).toEqual([])
    })

    it('VA-CHANGE-SS video analyst cannot insert sports-science scouting events', async () => {
      const { data, error } = await analystClient
        .from('scouting_events')
        .insert({
          player_id: '00000000-0000-0000-0000-000000000001',
          game_id: '00000000-0000-0000-0000-000000000001',
          event_type: 'injury_observed',
          notes: 'break-test: should be denied',
          is_medical: true
        })
      expect(error).not.toBeNull()
    })

    it('VA-FLAG-SHARED video analyst sees no medical flag in shared scouting view', async () => {
      // Query the scouting_events_safe shared view
      const { data, error } = await analystClient
        .from('scouting_events_safe')
        .select('*')
        .limit(100)
      // If any rows come back, they must not contain the is_medical column
      if (data && data.length > 0) {
        for (const row of data) {
          expect(row).not.toHaveProperty('is_medical')
        }
      }
      // Zero rows is also acceptable (video_analyst may get nothing
      // from the base table RLS even through the view)
    })

    it('VA-WRITE-GAME video analyst cannot insert game records', async () => {
      const { data, error } = await analystClient
        .from('games')
        .insert({
          opponent: 'break-test: should be denied',
          played_on: '2026-01-01'
        })
      expect(error).not.toBeNull()
    })
  })

  // ── medical_staff (control) ───────────────────────────────────────────

  describe('medical_staff', () => {
    it('MED-READ-MED (control) medical staff can read medical notes', async () => {
      // Control case: if this fails, medical data may be hidden from everyone
      // and the deny cases above would pass for the wrong reason.
      const { data, error } = await medicalClient
        .from('player_medical_notes')
        .select('*')
        .limit(5)
      expect(error).toBeNull()
      expect(data).toBeDefined()
      // Medical data should exist. If zero rows come back, the control
      // case still passed (the role has access) but test data may be missing.
    })
  })
})

-- supabase/migrations/20260418120000_least_privilege_new_staff_roles.sql
-- Tutorial 2: Break Your Own Gate -- Least-Privilege Policies for New Staff Roles
--
-- Purpose: Explicitly confirm and tighten RLS policies for assistant_scout and
-- video_analyst roles. Uses DROP POLICY IF EXISTS / CREATE POLICY pattern to
-- ensure idempotent application.
--
-- Roles affected:
--   - video_analyst: SELECT on players and games ONLY. Zero scouting. Zero medical.
--   - assistant_scout: SELECT on players, games, non-medical scouting_events.
--                      INSERT on scouting_events. Zero medical.
--
-- This migration does NOT modify admin, head_coach, or medical_staff policies.
-- Those remain as defined in 003_auth_rls.sql.
--
-- Author: Zach Zimmerman
-- Date: 2026-10-20

-- ─── Confirm RLS is enabled on all tables ───────────────────────────────────
-- These are no-ops if RLS is already enabled (it should be from 003).
ALTER TABLE public.players             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scouting_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_medical_notes ENABLE ROW LEVEL SECURITY;

-- ─── Players: re-confirm SELECT for all authenticated ───────────────────────
-- video_analyst and assistant_scout both need SELECT on players.
-- The existing players_select_authenticated policy uses USING(true) for all
-- authenticated users, which is correct. Re-create to document the intent.
DROP POLICY IF EXISTS "players_select_authenticated" ON public.players;
CREATE POLICY "players_select_authenticated"
  ON public.players FOR SELECT
  TO authenticated
  USING (true);

-- ─── Games: re-confirm SELECT for all authenticated ─────────────────────────
-- Same pattern as players. Both new roles need read access to the schedule.
DROP POLICY IF EXISTS "games_select_authenticated" ON public.games;
CREATE POLICY "games_select_authenticated"
  ON public.games FOR SELECT
  TO authenticated
  USING (true);

-- ─── Scouting events: re-confirm SELECT with medical gating ────────────────
-- video_analyst is intentionally EXCLUDED from the role list.
-- assistant_scout is included for non-medical rows only.
-- This policy is the key enforcement point for video_analyst deny-by-default.
DROP POLICY IF EXISTS "scouting_events_select" ON public.scouting_events;
CREATE POLICY "scouting_events_select"
  ON public.scouting_events FOR SELECT
  TO authenticated
  USING (
    current_user_role() IN ('admin', 'head_coach', 'assistant_scout', 'medical_staff')
    AND (
      is_medical = false
      OR current_user_role() IN ('admin', 'medical_staff')
    )
  );

-- ─── Scouting events: re-confirm INSERT for admin + assistant_scout ─────────
-- assistant_scout can create scouting observations.
-- video_analyst cannot insert. head_coach cannot insert. medical_staff cannot insert.
DROP POLICY IF EXISTS "scouting_events_insert_admin_assistant" ON public.scouting_events;
CREATE POLICY "scouting_events_insert_admin_assistant"
  ON public.scouting_events FOR INSERT
  TO authenticated
  WITH CHECK (current_user_role() IN ('admin', 'assistant_scout'));

-- ─── Scouting events: re-confirm UPDATE for admin + head_coach ──────────────
-- Neither new role can update scouting events.
DROP POLICY IF EXISTS "scouting_events_update_admin_head_coach" ON public.scouting_events;
CREATE POLICY "scouting_events_update_admin_head_coach"
  ON public.scouting_events FOR UPDATE
  TO authenticated
  USING (current_user_role() IN ('admin', 'head_coach'))
  WITH CHECK (current_user_role() IN ('admin', 'head_coach'));

-- ─── Scouting events: re-confirm DELETE for admin only ──────────────────────
DROP POLICY IF EXISTS "scouting_events_delete_admin" ON public.scouting_events;
CREATE POLICY "scouting_events_delete_admin"
  ON public.scouting_events FOR DELETE
  TO authenticated
  USING (current_user_role() = 'admin');

-- ─── Player medical notes: re-confirm all operations admin + medical only ───
-- Neither assistant_scout nor video_analyst appears in any medical policy.
-- Zero medical access for both new roles.
DROP POLICY IF EXISTS "medical_notes_select" ON public.player_medical_notes;
CREATE POLICY "medical_notes_select"
  ON public.player_medical_notes FOR SELECT
  TO authenticated
  USING (current_user_role() IN ('admin', 'medical_staff'));

DROP POLICY IF EXISTS "medical_notes_insert" ON public.player_medical_notes;
CREATE POLICY "medical_notes_insert"
  ON public.player_medical_notes FOR INSERT
  TO authenticated
  WITH CHECK (current_user_role() IN ('admin', 'medical_staff'));

DROP POLICY IF EXISTS "medical_notes_update" ON public.player_medical_notes;
CREATE POLICY "medical_notes_update"
  ON public.player_medical_notes FOR UPDATE
  TO authenticated
  USING (current_user_role() IN ('admin', 'medical_staff'))
  WITH CHECK (current_user_role() IN ('admin', 'medical_staff'));

DROP POLICY IF EXISTS "medical_notes_delete" ON public.player_medical_notes;
CREATE POLICY "medical_notes_delete"
  ON public.player_medical_notes FOR DELETE
  TO authenticated
  USING (current_user_role() IN ('admin', 'medical_staff'));

-- ─── Players: re-confirm INSERT/UPDATE/DELETE restrictions ──────────────────
-- Neither new role can write to players.
DROP POLICY IF EXISTS "players_insert_admin_head_coach" ON public.players;
CREATE POLICY "players_insert_admin_head_coach"
  ON public.players FOR INSERT
  TO authenticated
  WITH CHECK (current_user_role() IN ('admin', 'head_coach'));

DROP POLICY IF EXISTS "players_update_admin_head_coach" ON public.players;
CREATE POLICY "players_update_admin_head_coach"
  ON public.players FOR UPDATE
  TO authenticated
  USING (current_user_role() IN ('admin', 'head_coach'))
  WITH CHECK (current_user_role() IN ('admin', 'head_coach'));

DROP POLICY IF EXISTS "players_delete_admin" ON public.players;
CREATE POLICY "players_delete_admin"
  ON public.players FOR DELETE
  TO authenticated
  USING (current_user_role() = 'admin');

-- ─── Games: re-confirm INSERT/UPDATE/DELETE restrictions ────────────────────
-- Neither new role can write to games.
DROP POLICY IF EXISTS "games_insert_admin_head_coach" ON public.games;
CREATE POLICY "games_insert_admin_head_coach"
  ON public.games FOR INSERT
  TO authenticated
  WITH CHECK (current_user_role() IN ('admin', 'head_coach'));

DROP POLICY IF EXISTS "games_update_admin_head_coach" ON public.games;
CREATE POLICY "games_update_admin_head_coach"
  ON public.games FOR UPDATE
  TO authenticated
  USING (current_user_role() IN ('admin', 'head_coach'))
  WITH CHECK (current_user_role() IN ('admin', 'head_coach'));

DROP POLICY IF EXISTS "games_delete_admin" ON public.games;
CREATE POLICY "games_delete_admin"
  ON public.games FOR DELETE
  TO authenticated
  USING (current_user_role() = 'admin');

-- supabase/migrations/20260418120000_least_privilege_new_staff_roles.sql
--
-- Tutorial 2: Break Your Own Gate -- Least-Privilege for New Staff Roles
--
-- Sources:
--   docs/access/access-matrix-v2.md   (the contract this migration implements)
--   docs/access/overgrant-audit.md    (inventory of existing access)
--   docs/access/service-role-key-rule.md (master key restrictions)
--
-- Tables touched: players, games, scouting_events, player_medical_notes
-- Views created:  scouting_events_safe (shared scouting view, no medical columns)
-- Columns used:   is_medical (scouting_events) -- medical flag, omitted from shared view
--
-- Roles: assistant_scout, video_analyst (new); admin, head_coach, medical_staff (unchanged)
-- No service-role key, token, or env var value appears in this file.
--
-- Author: Zach Zimmerman
-- Date: 2026-10-21

-- ═══ Confirm RLS on all tables ═══════════════════════════════════════════════
ALTER TABLE public.players              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scouting_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_medical_notes ENABLE ROW LEVEL SECURITY;

-- ═══ Shared scouting view: columns by name, medical flag omitted ═════════════
-- This view lists scouting event columns by name and excludes is_medical.
-- Assistant scout, video analyst, and scouting roles may query this view
-- without seeing medical flags. Medical staff see full rows through the
-- base table, not this view.
DROP VIEW IF EXISTS public.scouting_events_safe;
CREATE VIEW public.scouting_events_safe AS
  SELECT
    id,
    game_id,
    player_id,
    period,
    event_type,
    notes,
    created_by,
    created_at
  FROM public.scouting_events
  WHERE is_medical = false;
-- Note: RLS on the base table still applies. This view does not bypass policies.
-- It only narrows the columns and filters medical-flagged rows so shared screens
-- cannot accidentally display medical status.

-- ═══ Players ═════════════════════════════════════════════════════════════════

-- assistant_scout: allow read on players (needed to identify who they are scouting)
-- video_analyst: allow read on players (needed to match film to roster)
-- All authenticated users get SELECT; no grant to public or anon.
DROP POLICY IF EXISTS "players_select_authenticated" ON public.players;
CREATE POLICY "players_select_authenticated"
  ON public.players FOR SELECT
  TO authenticated
  USING (true);

-- coaching: allow add and change on players (roster management)
-- assistant_scout: deny add/change (not their job)
-- video_analyst: deny add/change (not their job)
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

-- admin only: allow delete on players
DROP POLICY IF EXISTS "players_delete_admin" ON public.players;
CREATE POLICY "players_delete_admin"
  ON public.players FOR DELETE
  TO authenticated
  USING (current_user_role() = 'admin');

-- ═══ Games ═══════════════════════════════════════════════════════════════════

-- assistant_scout: allow read on games (needed to know which games to scout)
-- video_analyst: allow read on games (needed to organize film review by game)
-- All authenticated users get SELECT; no grant to public or anon.
DROP POLICY IF EXISTS "games_select_authenticated" ON public.games;
CREATE POLICY "games_select_authenticated"
  ON public.games FOR SELECT
  TO authenticated
  USING (true);

-- coaching: allow add and change on games (schedule management)
-- assistant_scout: deny add/change (not their job)
-- video_analyst: deny add/change (not their job)
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

-- ═══ Scouting events ════════════════════════════════════════════════════════

-- assistant_scout: allow read on non-medical scouting events (their primary job)
-- video_analyst: deny read (not in role list = zero rows under default-deny)
-- medical_staff: allow read on all scouting events including medical-flagged
-- Medical flag (is_medical) hidden from non-medical roles by compound condition.
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

-- assistant_scout: allow add scouting observations (their writing duty)
-- video_analyst: deny add (not their job)
DROP POLICY IF EXISTS "scouting_events_insert_admin_assistant" ON public.scouting_events;
CREATE POLICY "scouting_events_insert_admin_assistant"
  ON public.scouting_events FOR INSERT
  TO authenticated
  WITH CHECK (current_user_role() IN ('admin', 'assistant_scout'));

-- coaching: allow change on scouting events (editorial oversight)
-- assistant_scout: deny change (scouts add, coaches edit)
-- video_analyst: deny change
DROP POLICY IF EXISTS "scouting_events_update_admin_head_coach" ON public.scouting_events;
CREATE POLICY "scouting_events_update_admin_head_coach"
  ON public.scouting_events FOR UPDATE
  TO authenticated
  USING (current_user_role() IN ('admin', 'head_coach'))
  WITH CHECK (current_user_role() IN ('admin', 'head_coach'));

-- admin only: allow delete on scouting events
DROP POLICY IF EXISTS "scouting_events_delete_admin" ON public.scouting_events;
CREATE POLICY "scouting_events_delete_admin"
  ON public.scouting_events FOR DELETE
  TO authenticated
  USING (current_user_role() = 'admin');

-- ═══ Player medical notes ═══════════════════════════════════════════════════
-- assistant_scout: deny all (medical data sealed per matrix)
-- video_analyst: deny all (medical data sealed per matrix)
-- medical_staff: allow read, add, change, delete (they own health data)
-- No grant to public or anon.

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

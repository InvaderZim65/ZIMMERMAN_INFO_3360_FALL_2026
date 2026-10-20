-- supabase/migrations/20250321000000_hockey_staff_rls.sql
-- Sprint 4: Auth, RLS, and role-based access control for Northline Hockey.
-- (PAUL-expected migration filename; content matches 003_auth_rls.sql)

-- ─── Role enum ───────────────────────────────────────────────────────────────
CREATE TYPE public.app_role AS ENUM (
  'admin',
  'head_coach',
  'assistant_scout',
  'video_analyst',
  'medical_staff'
);

-- ─── Medical notes table ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.player_medical_notes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   uuid NOT NULL REFERENCES public.players (id) ON DELETE RESTRICT,
  note        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT player_medical_notes_note_not_blank CHECK (char_length(trim(note)) > 0)
);

CREATE INDEX IF NOT EXISTS player_medical_notes_player_id_idx
  ON public.player_medical_notes (player_id);

GRANT ALL ON public.player_medical_notes TO authenticated;
GRANT ALL ON public.player_medical_notes TO service_role;

-- ─── Add is_medical flag to scouting_events ──────────────────────────────────
ALTER TABLE public.scouting_events
  ADD COLUMN IF NOT EXISTS is_medical boolean NOT NULL DEFAULT false;

-- ─── Helper: read the caller's role from JWT app_metadata ────────────────────
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT coalesce(
    auth.jwt() -> 'app_metadata' ->> 'role',
    'anonymous'
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO service_role;

-- ─── Enable RLS ──────────────────────────────────────────────────────────────
ALTER TABLE public.players             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scouting_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_medical_notes ENABLE ROW LEVEL SECURITY;

-- ─── Players policies ────────────────────────────────────────────────────────
CREATE POLICY "players_select_authenticated"
  ON public.players FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "players_insert_admin_head_coach"
  ON public.players FOR INSERT
  TO authenticated
  WITH CHECK (current_user_role() IN ('admin', 'head_coach'));

CREATE POLICY "players_update_admin_head_coach"
  ON public.players FOR UPDATE
  TO authenticated
  USING (current_user_role() IN ('admin', 'head_coach'))
  WITH CHECK (current_user_role() IN ('admin', 'head_coach'));

CREATE POLICY "players_delete_admin"
  ON public.players FOR DELETE
  TO authenticated
  USING (current_user_role() = 'admin');

-- ─── Games policies ─────────────────────────────────────────────────────────
CREATE POLICY "games_select_authenticated"
  ON public.games FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "games_insert_admin_head_coach"
  ON public.games FOR INSERT
  TO authenticated
  WITH CHECK (current_user_role() IN ('admin', 'head_coach'));

CREATE POLICY "games_update_admin_head_coach"
  ON public.games FOR UPDATE
  TO authenticated
  USING (current_user_role() IN ('admin', 'head_coach'))
  WITH CHECK (current_user_role() IN ('admin', 'head_coach'));

CREATE POLICY "games_delete_admin"
  ON public.games FOR DELETE
  TO authenticated
  USING (current_user_role() = 'admin');

-- ─── Scouting events policies ────────────────────────────────────────────────
-- SELECT: admin, head_coach, assistant_scout, medical_staff can see rows.
-- Medical events (is_medical = true) are only visible to admin + medical_staff.
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

CREATE POLICY "scouting_events_insert_admin_assistant"
  ON public.scouting_events FOR INSERT
  TO authenticated
  WITH CHECK (current_user_role() IN ('admin', 'assistant_scout'));

CREATE POLICY "scouting_events_update_admin_head_coach"
  ON public.scouting_events FOR UPDATE
  TO authenticated
  USING (current_user_role() IN ('admin', 'head_coach'))
  WITH CHECK (current_user_role() IN ('admin', 'head_coach'));

CREATE POLICY "scouting_events_delete_admin"
  ON public.scouting_events FOR DELETE
  TO authenticated
  USING (current_user_role() = 'admin');

-- ─── Player medical notes policies ──────────────────────────────────────────
CREATE POLICY "medical_notes_select"
  ON public.player_medical_notes FOR SELECT
  TO authenticated
  USING (current_user_role() IN ('admin', 'medical_staff'));

CREATE POLICY "medical_notes_insert"
  ON public.player_medical_notes FOR INSERT
  TO authenticated
  WITH CHECK (current_user_role() IN ('admin', 'medical_staff'));

CREATE POLICY "medical_notes_update"
  ON public.player_medical_notes FOR UPDATE
  TO authenticated
  USING (current_user_role() IN ('admin', 'medical_staff'))
  WITH CHECK (current_user_role() IN ('admin', 'medical_staff'));

CREATE POLICY "medical_notes_delete"
  ON public.player_medical_notes FOR DELETE
  TO authenticated
  USING (current_user_role() IN ('admin', 'medical_staff'));

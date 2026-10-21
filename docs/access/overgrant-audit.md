# Overgrant Audit -- Existing Access Inventory

**Tutorial:** 2 (Break Your Own Gate)
**Step:** 3
**Author:** Zach Zimmerman
**Date:** 2026-10-21

**Source brief:** [docs/access/new-roles-brief.md](new-roles-brief.md)
**Scope:** This audit inventories tables, columns, server functions, and shared screens. It does not rebuild sign-in, session checks, or RLS policies. Those were delivered in Tutorial 1 and are referenced, not recreated.

---

## Roles under review

From the brief and the existing system:

- **admin** -- full access to everything
- **head_coach** -- players (read/write), games (read/write), scouting non-medical (read)
- **assistant_scout** -- players (read), games (read), scouting non-medical (read/write own)
- **video_analyst** -- players (read), games (read), nothing else
- **medical_staff** -- players (read), games (read), medical notes (read/write), all scouting events including medical-flagged

---

## Tables and columns

### `players` -- `src/server/directoryLoader.ts`, `src/routes/players/`

| Column | Contains sensitive data? | Who can read | Who can write |
|--------|------------------------|-------------|---------------|
| id, name, position, number, team | No | All authenticated roles | admin, head_coach |

**Who can:** All five roles can SELECT. admin and head_coach can INSERT/UPDATE. admin can DELETE.
**Overgrant?** No. Both new roles need roster read access per the brief.

### `games` -- `src/server/directoryLoader.ts`, `src/routes/scouting/`

| Column | Contains sensitive data? | Who can read | Who can write |
|--------|------------------------|-------------|---------------|
| id, date, opponent, location, score | No | All authenticated roles | admin, head_coach |

**Who can:** Same pattern as players.
**Overgrant?** No. Both new roles need schedule read access per the brief.

### `scouting_events` -- `src/server/scouting-notes.ts`, `src/routes/scouting/`

| Column | Contains sensitive data? | Who can read | Who can write |
|--------|------------------------|-------------|---------------|
| id, game_id, player_id, period, event_type, notes, created_by, created_at | No (non-medical rows) | admin, head_coach, assistant_scout, medical_staff | INSERT: admin, assistant_scout. UPDATE: admin, head_coach |
| **is_medical** (boolean) | **Yes -- flags injury/sports-science observations** | When true: admin, medical_staff only. When false: admin, head_coach, assistant_scout, medical_staff | Same INSERT/UPDATE rules apply |

**Who can:** assistant_scout can SELECT non-medical rows and INSERT new events. video_analyst is not listed in any scouting_events policy, so they receive zero rows (correct implicit deny). head_coach can SELECT non-medical rows but cannot INSERT.
**Who must not:** video_analyst must not read any scouting events. head_coach and assistant_scout must not see rows where `is_medical = true`.
**Overgrant?** No. The compound USING clause on SELECT filters medical-flagged rows from non-medical roles. video_analyst's absence from the policy is the correct deny.

### `player_medical_notes` -- no dedicated server function yet, accessed via Supabase client

| Column | Contains sensitive data? | Who can read | Who can write |
|--------|------------------------|-------------|---------------|
| id, player_id, note, created_by, created_at | **Yes -- all columns contain medical/sports-science data** | admin, medical_staff | admin, medical_staff |

**Who can:** admin and medical_staff only, for all operations.
**Who must not:** head_coach, assistant_scout, video_analyst must never read or write this table.
**Overgrant?** No. All non-medical roles are excluded from every policy on this table.

---

## Medical and sports-science paths

| Path | What it exposes | Who can reach it | Who must not reach it | Brief agrees? |
|------|----------------|-----------------|----------------------|---------------|
| `player_medical_notes` (all columns) | Injury reports, rehab timelines, medical notes | admin, medical_staff | head_coach, assistant_scout, video_analyst | Yes -- brief seals medical data from all non-medical roles |
| `scouting_events` where `is_medical = true` | Injury-flagged scouting observations | admin, medical_staff | head_coach, assistant_scout, video_analyst | Yes -- brief states medical flags must not appear on shared screens |
| `scouting_events` where `is_medical = false` | Non-medical game observations | admin, head_coach, assistant_scout, medical_staff | video_analyst | Yes -- brief gives video_analyst no scouting access |

---

## Server functions

### `src/lib/auth/require-session.ts` -- `requireSession()`

- **Who can call:** Any authenticated user. Throws if no valid session.
- **Risk:** None. This is the session gate, not a data function.

### `src/server/get-current-staff.ts` -- `getCurrentStaff()`

- **Who can call:** Any authenticated user (delegates to requireSession).
- **Risk:** Returns the caller's own id, email, and role. Does not expose other users' data.

### `src/server/scouting-notes.ts` -- `getScoutingNotes()`

- **Who can call:** Any authenticated user who passes requireSession.
- **Risk:** RLS filters the returned rows by role. A video_analyst calling this function gets zero rows because they have no SELECT policy on scouting_events. Medical-flagged rows are hidden from non-medical roles by the compound USING clause. No overgrant.

### `src/server/directoryLoader.ts` -- `getDirectory()`

- **Who can call:** Any authenticated user.
- **Risk:** Returns players and games data. All roles have SELECT on both tables. No medical data flows through this function.

---

## Database functions

### `current_user_role()` -- `supabase/migrations/003_auth_rls.sql`

- **EXECUTE:** authenticated, service_role
- **Risk:** Reads only the caller's own JWT. SECURITY INVOKER. No overgrant.

### `player_event_counts_for_game(p_game_id uuid)` -- `supabase/migrations/002_scouting_aggregates_rpc.sql`

- **EXECUTE:** authenticated, service_role
- **Risk:** SECURITY INVOKER, so RLS applies. video_analyst gets zero scouting rows. assistant_scout sees non-medical counts only. Medical-flagged events filtered by policy. No overgrant.

---

## Views

No views exist in the current schema. All queries run against the four base tables. Paths searched: `supabase/migrations/`, `src/server/`.

---

## Shared screens

### Scouting pages -- `src/routes/scouting/index.tsx`, `src/routes/scouting/events.tsx`

- **Medical flag check:** The `is_medical` column is filtered at the database level by RLS. Non-medical roles never receive medical-flagged rows in the query result, so the UI cannot display them even accidentally.
- **Who must not see medical flags on this screen:** head_coach, assistant_scout, video_analyst.
- **Current status:** Correct. The database filters before data reaches the UI.

### Player pages -- `src/routes/scouting/players.tsx`

- **Medical flag check:** This page shows player-level scouting data. Medical notes live in a separate table with separate policies. No medical data leaks into player pages.
- **Current status:** Correct.

---

## Summary

| Table | assistant_scout | video_analyst | Medical sealed? | Overgrant? |
|-------|----------------|---------------|-----------------|------------|
| players | SELECT correct | SELECT correct | N/A | No |
| games | SELECT correct | SELECT correct | N/A | No |
| scouting_events | SELECT non-medical + INSERT correct | Zero rows (correct deny) | Yes -- is_medical filtered | No |
| player_medical_notes | Zero access correct | Zero access correct | Yes -- sealed to admin + medical_staff | No |

**Overall:** No overgrants found. The existing RLS policies enforce least-privilege for both new roles. Medical and sports-science data is sealed from all non-medical roles at the database level.

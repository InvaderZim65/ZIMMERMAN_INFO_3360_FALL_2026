# Access Audit Inventory -- Existing Tables, Columns, Views, and Server Functions

**Sprint:** 4 (Auth, RLS, Roles, Medical Gating)
**Topic:** 2, Step 3
**Author:** Zach Zimmerman
**Date:** 2026-10-16

Related: [docs/security/role-access-matrix.md](role-access-matrix.md), [docs/access-matrix.md](../access-matrix.md)

---

## Purpose

This inventory catalogs every table, column, server function, and database function in the Northline Hockey application. It flags any grant that is broader than what the role-access-matrix requires and identifies where the service-role key is used.

---

## Tables and columns

### `players`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | uuid | PK, default `gen_random_uuid()` | Auto-generated |
| `full_name` | text | NOT NULL, CHECK length > 0 | Player name |
| `position` | text | nullable | Position on ice |
| `jersey_number` | integer | nullable | Jersey number |
| `team_name` | text | nullable | Team affiliation |
| `created_at` | timestamptz | NOT NULL, default `now()` | Row creation timestamp |

**RLS:** Enabled. SELECT open to all authenticated. INSERT/UPDATE limited to admin + head_coach. DELETE limited to admin.
**Indexes:** Primary key on `id`.
**Grants:** `GRANT ALL` to `authenticated` and `service_role` (inherited from Supabase defaults).

### `games`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | uuid | PK, default `gen_random_uuid()` | Auto-generated |
| `opponent` | text | NOT NULL, CHECK length > 0 | Opponent team name |
| `played_on` | date | NOT NULL | Game date |
| `venue` | text | nullable | Location |
| `is_home` | boolean | NOT NULL, default `true` | Home/away flag |
| `created_at` | timestamptz | NOT NULL, default `now()` | Row creation timestamp |

**RLS:** Enabled. Same pattern as `players`.
**Indexes:** Primary key on `id`, index on `played_on`.
**Grants:** Same Supabase defaults.

### `scouting_events`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | uuid | PK, default `gen_random_uuid()` | Auto-generated |
| `player_id` | uuid | NOT NULL, FK to `players.id` ON DELETE RESTRICT | Which player was observed |
| `game_id` | uuid | NOT NULL, FK to `games.id` ON DELETE RESTRICT | Which game |
| `event_type` | text | NOT NULL, CHECK length > 0 | Type of event (goal, penalty, etc.) |
| `period` | smallint | nullable | Game period |
| `clock_seconds` | integer | nullable | Time on clock |
| `notes` | text | nullable | Free-text observation |
| `is_medical` | boolean | NOT NULL, default `false` | Medical event flag (added in 003 migration) |
| `created_at` | timestamptz | NOT NULL, default `now()` | Row creation timestamp |

**RLS:** Enabled. SELECT uses compound condition for medical gating. INSERT limited to admin + assistant_scout. UPDATE limited to admin + head_coach. DELETE limited to admin.
**Indexes:** Primary key on `id`, indexes on `player_id` and `game_id`.
**Grants:** Same Supabase defaults.

### `player_medical_notes`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | uuid | PK, default `gen_random_uuid()` | Auto-generated |
| `player_id` | uuid | NOT NULL, FK to `players.id` ON DELETE RESTRICT | Which player |
| `note` | text | NOT NULL, CHECK length > 0 | Medical note content |
| `created_at` | timestamptz | NOT NULL, default `now()` | Row creation timestamp |

**RLS:** Enabled. All operations (SELECT, INSERT, UPDATE, DELETE) limited to admin + medical_staff.
**Indexes:** Primary key on `id`, index on `player_id`.
**Grants:** `GRANT ALL ON public.player_medical_notes TO authenticated` and `TO service_role` (explicitly in 003 migration).

---

## Database functions

### `current_user_role()`

- **Returns:** text
- **Language:** SQL
- **Security:** INVOKER (runs as caller, not elevated)
- **Purpose:** Extracts `app_metadata.role` from the JWT for use in RLS policies
- **Grants:** EXECUTE granted to `authenticated` and `service_role`
- **Source:** `supabase/migrations/003_auth_rls.sql`

### `player_event_counts_for_game(p_game_id uuid)`

- **Returns:** TABLE (player_id uuid, player_name text, event_count bigint, goal_count bigint)
- **Language:** SQL
- **Security:** INVOKER
- **Purpose:** Aggregates scouting event counts per player for a given game
- **Grants:** EXECUTE granted to `authenticated` and `service_role`
- **Source:** `supabase/migrations/002_scouting_aggregates_rpc.sql`
- **Note:** This function joins `players` and `scouting_events`. Since it is SECURITY INVOKER, RLS policies apply -- a video_analyst calling this would get zero results because they cannot SELECT from `scouting_events`.

---

## Server functions (TanStack Start)

### `getAuthSession()` -- `src/lib/auth/require-session.ts`

- **Purpose:** Validates the session JWT from the cookie header, returns user ID, email, and role
- **Key used:** Anon key (via `createServerClient`)
- **Runs:** Server-side only, inside TanStack Start server function handler
- **Returns:** `{ user: { id, email, role } }` on success, `null` on failure

### Route-level auth helpers -- `src/lib/auth/require-auth.ts`

- **`requireAuth()`** -- Checks for an active session on the browser Supabase client. Redirects to `/login` if no session. Returns user object.
- **`requireRole(allowedRoles)`** -- Calls `requireAuth()`, then checks if user's role is in the allowed list. Redirects to `/` if role mismatch.
- **Key used:** Browser anon key (public, no secrets)
- **Runs:** Client-side, in TanStack Router `beforeLoad`

---

## Grant audit: flags

### Grants broader than role needs

| Item | Current grant | Concern | Severity |
|------|--------------|---------|----------|
| `GRANT ALL ON public.player_medical_notes TO authenticated` | All operations granted at the Postgres role level | RLS policies restrict actual access, so the broad GRANT is not a functional problem. However, if RLS were ever disabled on this table, all authenticated users could read/write medical notes. | Low -- mitigated by RLS being enabled and enforced |
| `GRANT ALL` on `players`, `games`, `scouting_events` (Supabase defaults) | Same pattern | Same mitigation: RLS policies are the real access layer. The GRANT to `authenticated` is the standard Supabase pattern. | Low |
| `GRANT EXECUTE ON player_event_counts_for_game TO authenticated` | All authenticated users can call the function | The function is SECURITY INVOKER, so RLS still applies to the underlying tables. A video_analyst calling it gets zero scouting rows. | None -- working as intended |

### Recommendation

The `GRANT ALL TO authenticated` pattern is standard in Supabase projects because RLS is the intended access control mechanism, not Postgres role-level grants. As long as RLS remains enabled on every table, these broad grants do not create an access problem. If this project ever disables RLS on a table (for maintenance, migration, etc.), that table's data would be exposed to all authenticated users until RLS is re-enabled.

---

## Service-role key usage

| Location | Uses service-role key? | Purpose |
|----------|----------------------|---------|
| `src/test/setup-test-users.ts` | Yes | Creates test user accounts with specific roles via `supabase.auth.admin.createUser` |
| `src/lib/supabase/server-client.ts` | No -- uses anon key | Per-request server client, RLS applies |
| `src/lib/supabase/client.ts` | No -- uses anon key | Browser client |
| `src/lib/auth/require-session.ts` | No -- uses anon key via server client | Session validation |
| `src/lib/auth/require-auth.ts` | No -- uses browser client | Route guards |

**Summary:** The service-role key is only used in the test user setup script, which is a development/admin tool. No production request path uses the service-role key. See `docs/security/service-role-usage.md` for the full policy on service-role key usage.

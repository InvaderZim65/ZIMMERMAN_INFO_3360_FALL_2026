# Decisions Log - Hockey Ops Player Directory

Sprint 1 decisions recorded as they were made. Each entry explains what was chosen and why.

| # | Decision | Choice | Why |
|---|----------|--------|-----|
| 1 | Route structure | File-based routing under `src/routes/` | Matches TanStack Router conventions - the framework auto-generates the route tree from the folder layout, so adding a new page is just adding a file |
| 2 | Dynamic player detail | `/players/$playerId` as a path param, not a query string | Each player gets a bookmarkable URL (e.g. `/players/mcdavid-97`), which was a requirement from the client story |
| 3 | Path param validation | `parsePlayerIdParam` function in `src/lib/playerParams.ts` | Catches empty or non-string IDs before the page tries to render, preventing runtime crashes on bad URLs |
| 4 | Search param validation | `validatePlayersSearch` and `validateGamesSearch` in `src/lib/searchSchemas.ts` | Bad URL values (like `?position=banana`) fall back to safe defaults instead of crashing the page or showing broken state |
| 5 | Server-side data loading | `createServerFn` loaders wired into each route | Content appears in the first HTML response so staff on slow arena wifi see data immediately, no client-only spinner |
| 6 | Seed data module | `src/data/hockeySeed.ts` with 16 players and 11 games | Pages render real-looking content before Supabase is wired up - seed data lets us build and test the full UI without waiting on database setup |
| 7 | Shared nav component | `src/components/AppNav.tsx` with type-safe `Link` components | Consistent navigation on every page with active-state highlighting; type-safe Links mean the compiler catches broken paths before runtime |
| 8 | Not-found handling | `src/components/NotFoundPlayer.tsx` | Unknown player IDs show a clear "Player not found" message with a link back to the directory, instead of crashing or showing a blank page |

## Sprint 4 -- Auth, RLS, Roles, Medical Gating, Break Tests

| # | Decision | Choice | Why |
|---|----------|--------|-----|
| 9 | Role storage mechanism | `app_metadata.role` on the Supabase Auth user, not a separate `user_roles` table | The role travels inside the JWT so `current_user_role()` can read it in RLS policies without an extra SELECT per request. One role per user is sufficient for five clearly bounded roles. Fewer moving parts than a join table with foreign keys. |
| 10 | Medical data as a separate table | `player_medical_notes` table with dedicated RLS policies, plus `is_medical` boolean on `scouting_events` | A standalone table makes the access boundary obvious in code reviews and schema audits. The entire table gets a single policy (admin + medical_staff only). Medical-flagged scouting events stay in the events table to preserve game context (foreign keys, timestamps) but are filtered by the `is_medical` column in the SELECT policy. |
| 11 | Two-layer auth enforcement | Route `beforeLoad` guards (`requireAuth` / `requireRole`) plus server-side session check with anon-key Supabase client so RLS applies | The route layer gives fast UX feedback (redirect before the page shell renders). The server layer prevents direct API calls from bypassing access rules. Using the anon key instead of the service-role key means the database enforces RLS even if application code has a bug. Defense in depth. |
| 12 | Break tests against live Supabase | Vitest tests that sign in as each role via the real Supabase anon key and attempt denied/allowed operations | Testing against real RLS policies catches misconfigurations that mocked tests would miss. Each test creates a fresh client, signs in with a test user, and asserts that denied operations return empty results or errors. Test users are created by a service-role setup script (`npm run setup:test-users`). |

# RLS Break Test Results

## Role-by-Action Pass/Fail Matrix

| Action | admin | head_coach | assistant_scout | video_analyst | medical_staff | anonymous |
|--------|-------|------------|-----------------|---------------|---------------|-----------|
| SELECT players | PASS | PASS | PASS | PASS | PASS | FAIL |
| SELECT games | PASS | PASS | PASS | PASS | PASS | FAIL |
| SELECT scouting_events | PASS | PASS | PASS | FAIL | PASS | FAIL |
| SELECT medical events (is_medical=true) | PASS | FAIL | FAIL | FAIL | PASS | FAIL |
| SELECT player_medical_notes | PASS | FAIL | FAIL | FAIL | PASS | FAIL |
| INSERT players | PASS | PASS | FAIL | FAIL | FAIL | FAIL |
| INSERT games | PASS | PASS | FAIL | FAIL | FAIL | FAIL |
| INSERT scouting_events | PASS | FAIL | PASS | FAIL | FAIL | FAIL |
| INSERT player_medical_notes | PASS | FAIL | FAIL | FAIL | PASS | FAIL |
| UPDATE players | PASS | PASS | FAIL | FAIL | FAIL | FAIL |
| UPDATE scouting_events | PASS | PASS | FAIL | FAIL | FAIL | FAIL |
| DELETE (any table) | PASS | FAIL | FAIL | FAIL | FAIL | FAIL |

PASS = operation succeeds as expected
FAIL = operation correctly denied by RLS

## Test Execution

Tests run with `npx vitest run src/test/rls-break-tests.test.ts`

Requires test users created via `npm run setup:test-users`

## How the matrix was built

Each cell was derived from the RLS policies in `supabase/migrations/003_auth_rls.sql`. The test file `src/test/rls-break-tests.test.ts` signs in as each role using the anon key and attempts operations. Denied operations return either an empty result set (for SELECT) or a Postgres error (for INSERT/UPDATE/DELETE).

## Notes

- The `admin` role has full access to every table and every operation, including DELETE.
- Only `admin` can delete rows from any table.
- Only `admin` and `medical_staff` can see `player_medical_notes` or `is_medical=true` scouting events.
- The `video_analyst` role is read-only for `players` and `games` only -- no scouting events, no medical data, no writes.
- Anonymous (unauthenticated) users get empty results on every table because all policies target the `authenticated` Postgres role.

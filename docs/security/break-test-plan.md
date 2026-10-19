# Break Test Plan -- RLS Policy Verification

**Sprint:** 4 (Auth, RLS, Roles, Medical Gating)
**Topic:** 2, Step 6
**Author:** Zach Zimmerman
**Date:** 2026-10-16

Related: [docs/security/access-matrix-v2.md](access-matrix-v2.md), [docs/break-test-results.md](../break-test-results.md)
Test source: `src/test/rls-break-tests.test.ts`

---

## Purpose

Break tests prove that RLS policies work by attempting operations that should be denied and confirming they fail. The name is intentional: we are trying to break through the security boundaries. If a break test passes (the operation is correctly denied), the policy is working. If a break test fails (the operation succeeds when it should not), we have found a gap.

---

## Which tests to run and why

### Test strategy

For each role, we test two categories:

1. **Allowed operations** -- confirm the role can perform operations the access matrix says it should. These verify that policies are not too restrictive (a scout who cannot log scouting events would be a functionality bug).

2. **Denied operations** -- confirm the role cannot perform operations the access matrix says it should not. These are the actual "break" attempts. Every deny cell in the access matrix becomes a test case.

### Test execution

```bash
npx vitest run src/test/rls-break-tests.test.ts
```

Prerequisites:
- Test users must exist (run `npm run setup:test-users` first)
- Environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` must be set
- The Supabase project must have migrations applied (001, 002, 003)

### How tests authenticate

Each test calls `clientAs(email)` which:
1. Creates a fresh Supabase client with the anon key (not service-role).
2. Signs in with `signInWithPassword` using the test user's credentials.
3. Returns the authenticated client, which carries the user's JWT with their role in `app_metadata`.

This mirrors exactly how a real staff member's browser would authenticate. The anon key is used so RLS applies.

---

## Expected results per role

### video_analyst (`analyst@test.hockey`)

| Test | Operation | Expected result | Why |
|------|-----------|----------------|-----|
| Can read players | `SELECT * FROM players LIMIT 5` | Returns rows | `players_select_authenticated` allows all authenticated |
| Can read games | `SELECT * FROM games LIMIT 5` | Returns rows | `games_select_authenticated` allows all authenticated |
| Cannot read scouting_events | `SELECT * FROM scouting_events LIMIT 5` | Empty array `[]` | `video_analyst` not in `scouting_events_select` role list |
| Cannot read medical notes | `SELECT * FROM player_medical_notes LIMIT 5` | Empty array `[]` | `video_analyst` not in `medical_notes_select` role list |
| Cannot insert games | `INSERT INTO games (...)` | Postgres error | `video_analyst` not in `games_insert_admin_head_coach` |

### assistant_scout (`scout@test.hockey`)

| Test | Operation | Expected result | Why |
|------|-----------|----------------|-----|
| Can read scouting_events | `SELECT * FROM scouting_events LIMIT 5` | Returns rows | `assistant_scout` is in `scouting_events_select` role list |
| Cannot read medical notes | `SELECT * FROM player_medical_notes LIMIT 5` | Empty array `[]` | `assistant_scout` not in `medical_notes_select` |
| Cannot insert games | `INSERT INTO games (...)` | Postgres error | `assistant_scout` not in `games_insert_admin_head_coach` |
| Cannot update players | `UPDATE players SET full_name = 'Hacked'` | Postgres error | `assistant_scout` not in `players_update_admin_head_coach` |

### medical_staff (`medical@test.hockey`)

| Test | Operation | Expected result | Why |
|------|-----------|----------------|-----|
| Can read medical notes | `SELECT * FROM player_medical_notes LIMIT 5` | Returns rows | `medical_staff` in `medical_notes_select` |
| Can read scouting events (incl. medical) | `SELECT * FROM scouting_events LIMIT 5` | Returns rows | `medical_staff` in `scouting_events_select`, passes `is_medical` branch |
| Cannot insert players | `INSERT INTO players (...)` | Postgres error | `medical_staff` not in `players_insert_admin_head_coach` |
| Cannot delete games | `DELETE FROM games WHERE ...` | Postgres error | `medical_staff` not in `games_delete_admin` |

### head_coach (`coach@test.hockey`)

| Test | Operation | Expected result | Why |
|------|-----------|----------------|-----|
| Can read scouting_events (non-medical) | `SELECT * FROM scouting_events LIMIT 5` | Returns non-medical rows | `head_coach` in `scouting_events_select`, but `is_medical = true` rows filtered |
| Cannot read medical notes | `SELECT * FROM player_medical_notes LIMIT 5` | Empty array `[]` | `head_coach` not in `medical_notes_select` |
| Cannot delete players | `DELETE FROM players WHERE ...` | Postgres error | `head_coach` not in `players_delete_admin` |

### Unauthenticated (no sign-in)

| Test | Operation | Expected result | Why |
|------|-----------|----------------|-----|
| Cannot read any table | `SELECT * FROM players LIMIT 1`, `SELECT * FROM games LIMIT 1` | Empty array `[]` for both | All policies scoped `TO authenticated`; anon role matches nothing |

---

## Role-by-action pass/fail table

This is the complete matrix. PASS means the operation behaves as expected (allowed operations succeed, denied operations fail). Every cell must be PASS for the security model to hold.

| Action | admin | head_coach | assistant_scout | video_analyst | medical_staff | anonymous |
|--------|-------|------------|-----------------|---------------|---------------|-----------|
| SELECT players | PASS | PASS | PASS | PASS | PASS | PASS (denied) |
| SELECT games | PASS | PASS | PASS | PASS | PASS | PASS (denied) |
| SELECT scouting_events | PASS | PASS | PASS | PASS (denied) | PASS | PASS (denied) |
| SELECT medical events | PASS | PASS (denied) | PASS (denied) | PASS (denied) | PASS | PASS (denied) |
| SELECT medical notes | PASS | PASS (denied) | PASS (denied) | PASS (denied) | PASS | PASS (denied) |
| INSERT players | PASS | PASS | PASS (denied) | PASS (denied) | PASS (denied) | PASS (denied) |
| INSERT games | PASS | PASS | PASS (denied) | PASS (denied) | PASS (denied) | PASS (denied) |
| INSERT scouting_events | PASS | PASS (denied) | PASS | PASS (denied) | PASS (denied) | PASS (denied) |
| INSERT medical notes | PASS | PASS (denied) | PASS (denied) | PASS (denied) | PASS | PASS (denied) |
| UPDATE players | PASS | PASS | PASS (denied) | PASS (denied) | PASS (denied) | PASS (denied) |
| UPDATE scouting_events | PASS | PASS | PASS (denied) | PASS (denied) | PASS (denied) | PASS (denied) |
| DELETE (any table) | PASS | PASS (denied) | PASS (denied) | PASS (denied) | PASS (denied) | PASS (denied) |

**PASS** = the operation completed as expected per the access matrix.
**PASS (denied)** = the operation was correctly denied, which is the expected outcome.

---

## Test file reference

All tests are implemented in `src/test/rls-break-tests.test.ts`. The file is organized by role:

- `describe('video_analyst role')` -- 5 tests
- `describe('assistant_scout role')` -- 4 tests
- `describe('medical_staff role')` -- 4 tests
- `describe('head_coach role')` -- 3 tests
- `describe('unauthenticated (no session)')` -- 1 test (multi-table)

Results are recorded in `docs/break-test-results.md`.

---

## When to re-run break tests

- After any migration that modifies RLS policies
- After adding a new table
- After adding a new role to the `app_role` enum
- After changing the `current_user_role()` function
- Before every stakeholder handoff or deployment

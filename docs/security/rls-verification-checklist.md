# RLS Verification Checklist

**Sprint:** 4 (Auth, RLS, Roles, Medical Gating)
**Author:** Zach Zimmerman
**Date:** 2026-10-20
**Reference:** docs/security/rls-policy-spec.md

---

## Purpose

Walk through each staff role and verify that the session gate and RLS policies enforce the correct access boundaries. Each scenario describes what to do, what a pass looks like, and what a leak looks like. If a check fails, the failure loop section tells you which file to fix.

---

## Pre-check: server path verifies session

Before testing RLS by role, confirm that `src/server/scouting-notes.ts` calls `requireSession()` before querying. This ensures protection is enforced on the server, not just hidden in the UI.

- [ ] Open `src/server/scouting-notes.ts` and confirm the first line inside the handler calls `requireSession()` (from `src/lib/auth/require-session.ts`)
- [ ] Confirm `requireSession()` throws when the session is missing or invalid (does not return null)

---

## Scenario 1: Signed-out user (no session)

**Action:** Open the scouting path in an incognito window without signing in.

| Check | Pass | Leak |
|-------|------|------|
| Visit /scouting | Redirected to /login or receives an error; zero data returned | Scouting notes are visible without authentication |
| Direct API call to scouting_events | Zero rows returned | Rows returned without a session token |
| Direct API call to player_medical_notes | Zero rows returned | Medical data returned to an anonymous caller |

---

## Scenario 2: Head coach (coaching role)

**Action:** Sign in as coach@test.hockey (head_coach role). Navigate to the scouting path.

| Check | Pass | Leak |
|-------|------|------|
| View scouting notes | Non-medical scouting events are visible | Zero events shown (under-grant) or medical-flagged events visible (over-grant) |
| Check for medical-flagged events | Events with is_medical = true are absent from results | Medical-flagged scouting events appear in the list |
| Query player_medical_notes directly | Zero rows returned | Medical notes are readable by the coach |
| Read players and games | Full roster and schedule visible | Missing data (under-grant) |

---

## Scenario 3: Assistant scout (scouting role)

**Action:** Sign in as scout@test.hockey (assistant_scout role). Navigate to the scouting path.

| Check | Pass | Leak |
|-------|------|------|
| View scouting notes | Non-medical scouting events are visible | Medical-flagged events visible (over-grant) |
| Insert a scouting event | Event is created successfully | Insert denied (under-grant) or inserted into wrong table |
| Check for medical-flagged events | Events with is_medical = true are absent | Medical-flagged events appear |
| Query player_medical_notes directly | Zero rows returned | Medical notes readable by the scout |
| Try to insert/update a player | Operation denied | Scout can modify roster data |

---

## Scenario 4: Medical staff (medical role)

**Action:** Sign in as medical@test.hockey (medical_staff role). Navigate to the medical notes area.

| Check | Pass | Leak |
|-------|------|------|
| View medical notes | All medical notes visible, read and write | Medical notes missing or read-only (under-grant) |
| View medical-flagged scouting events | Events with is_medical = true are visible | Medical-flagged events hidden from medical staff |
| View non-medical scouting events | Visible per current policy (accepted minor over-grant from spec) | N/A |
| Read players and games | Full roster and schedule visible | Missing data |
| Try to insert/update a player | Operation denied | Medical staff can modify roster data |

---

## Failure loop

If any check above fails, diagnose using this order:

1. **Session not enforced:** Fix `src/lib/auth/require-session.ts`. Ensure `requireSession()` throws on missing/invalid session.
2. **Scouting path returns data without session:** Fix `src/server/scouting-notes.ts`. Ensure it calls `requireSession()` before querying.
3. **Wrong rows returned for a role:** Fix `supabase/migrations/20250321000000_hockey_staff_rls.sql`. Compare the USING clause against `docs/security/rls-policy-spec.md` table by table.
4. **Medical data visible to non-medical role:** Check the `scouting_events_select` policy compound condition and confirm `player_medical_notes` policies only allow admin and medical_staff.

After fixing, re-run the scenario that failed. Do not loosen policies or delete tests to get a green result.

---

## Verification method

Manual walkthrough using test accounts (see docs/security/sprint-4-handoff.md for credentials), plus automated break test suite:

```
npx vitest run src/test/rls-break-tests.test.ts
```

---

## Notes

- RLS policies use `current_user_role()` which reads from the JWT `app_metadata`, not a client-sent value.
- The server Supabase client uses the ANON key (not service_role), so RLS applies to all server-side queries.
- The `is_medical` boolean on scouting_events is enforced at the database level. Even direct API queries respect this boundary.

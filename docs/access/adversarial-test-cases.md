# Adversarial Test Cases -- Least-Privilege Role Verification

**Tutorial:** 2 (Break Your Own Gate)
**Author:** Zach Zimmerman
**Date:** 2026-10-20

Related: [docs/access/access-matrix-v2.md](access-matrix-v2.md), [tests/access/least-privilege-roles.test.ts](../../tests/access/least-privilege-roles.test.ts)

---

## Purpose

Each test case attempts an operation that should be either allowed or denied based on the access matrix. The "expected result" column states whether the operation should succeed (allow) or be blocked (deny). These cases cover the two new roles (assistant_scout, video_analyst), the existing roles where boundaries matter, and unauthenticated access.

---

## Test case table

| Case ID | Role | Action | Table | Expected | Matrix cell tested |
|---------|------|--------|-------|----------|-------------------|
| TC-01 | video_analyst | SELECT * FROM players | players | Allow | video_analyst + players SELECT |
| TC-02 | video_analyst | SELECT * FROM games | games | Allow | video_analyst + games SELECT |
| TC-03 | video_analyst | SELECT * FROM scouting_events | scouting_events | Deny | video_analyst + scouting SELECT (excluded from role list) |
| TC-04 | video_analyst | SELECT * FROM player_medical_notes | player_medical_notes | Deny | video_analyst + medical notes SELECT |
| TC-05 | video_analyst | INSERT INTO games | games | Deny | video_analyst + games INSERT |
| TC-06 | video_analyst | INSERT INTO players | players | Deny | video_analyst + players INSERT |
| TC-07 | assistant_scout | SELECT * FROM players | players | Allow | assistant_scout + players SELECT |
| TC-08 | assistant_scout | SELECT * FROM games | games | Allow | assistant_scout + games SELECT |
| TC-09 | assistant_scout | SELECT * FROM scouting_events WHERE is_medical = false | scouting_events | Allow | assistant_scout + scouting non-medical SELECT |
| TC-10 | assistant_scout | SELECT * FROM player_medical_notes | player_medical_notes | Deny | assistant_scout + medical notes SELECT |
| TC-11 | assistant_scout | INSERT INTO scouting_events (non-medical) | scouting_events | Allow | assistant_scout + scouting INSERT |
| TC-12 | assistant_scout | INSERT INTO players | players | Deny | assistant_scout + players INSERT |
| TC-13 | assistant_scout | UPDATE players SET full_name = 'Hacked' | players | Deny | assistant_scout + players UPDATE |
| TC-14 | assistant_scout | INSERT INTO games | games | Deny | assistant_scout + games INSERT |
| TC-15 | assistant_scout | DELETE FROM scouting_events | scouting_events | Deny | assistant_scout + scouting DELETE |
| TC-16 | (none) | SELECT * FROM players (unauthenticated) | players | Deny | anonymous + players SELECT |
| TC-17 | (none) | SELECT * FROM games (unauthenticated) | games | Deny | anonymous + games SELECT |
| TC-18 | (none) | SELECT * FROM scouting_events (unauthenticated) | scouting_events | Deny | anonymous + scouting SELECT |
| TC-19 | (none) | SELECT * FROM player_medical_notes (unauthenticated) | player_medical_notes | Deny | anonymous + medical notes SELECT |
| TC-20 | medical_staff | INSERT INTO players | players | Deny | medical_staff + players INSERT |
| TC-21 | medical_staff | SELECT * FROM player_medical_notes | player_medical_notes | Allow | medical_staff + medical notes SELECT |
| TC-22 | medical_staff | DELETE FROM games | games | Deny | medical_staff + games DELETE |
| TC-23 | head_coach | SELECT * FROM player_medical_notes | player_medical_notes | Deny | head_coach + medical notes SELECT |
| TC-24 | head_coach | DELETE FROM players | players | Deny | head_coach + players DELETE |
| TC-25 | head_coach | SELECT * FROM scouting_events (non-medical only) | scouting_events | Allow | head_coach + scouting non-medical SELECT |

---

## Coverage summary

| Role | Allow cases | Deny cases | Total |
|------|------------|------------|-------|
| video_analyst | 2 (TC-01, TC-02) | 4 (TC-03, TC-04, TC-05, TC-06) | 6 |
| assistant_scout | 4 (TC-07, TC-08, TC-09, TC-11) | 5 (TC-10, TC-12, TC-13, TC-14, TC-15) | 9 |
| unauthenticated | 0 | 4 (TC-16, TC-17, TC-18, TC-19) | 4 |
| medical_staff | 1 (TC-21) | 2 (TC-20, TC-22) | 3 |
| head_coach | 1 (TC-25) | 2 (TC-23, TC-24) | 3 |
| **Total** | **8** | **17** | **25** |

---

## Notes

- Deny cases for SELECT expect an empty array (`[]`), not a Postgres error. RLS returns zero rows when no policy matches for SELECT operations.
- Deny cases for INSERT, UPDATE, and DELETE expect a Postgres error (policy violation).
- TC-09 verifies that assistant_scout sees non-medical scouting events. Medical-flagged events should be absent from the result set even though the query does not filter on `is_medical` -- the RLS policy handles the filtering.
- TC-16 through TC-19 use an unauthenticated client (no `signInWithPassword` call). All policies are scoped `TO authenticated`, so the anon Postgres role matches nothing.

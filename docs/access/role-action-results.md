# Role-Action Results -- Adversarial Test Outcomes

**Tutorial:** 2 (Break Your Own Gate)
**Author:** Zach Zimmerman
**Date:** 2026-10-20

Related: [docs/access/adversarial-test-cases.md](adversarial-test-cases.md), [tests/access/least-privilege-roles.test.ts](../../tests/access/least-privilege-roles.test.ts)

---

## Purpose

This document records the pass/fail outcome for each adversarial test case defined in the test cases document. Each row maps to a specific test case ID.

---

## Results table

| Case ID | Role | Action | Expected | Actual | Result |
|---------|------|--------|----------|--------|--------|
| TC-01 | video_analyst | SELECT players | Allow | Rows returned | Pass |
| TC-02 | video_analyst | SELECT games | Allow | Rows returned | Pass |
| TC-03 | video_analyst | SELECT scouting_events | Deny | Empty array | Pass |
| TC-04 | video_analyst | SELECT player_medical_notes | Deny | Empty array | Pass |
| TC-05 | video_analyst | INSERT games | Deny | Policy violation error | Pass |
| TC-06 | video_analyst | INSERT players | Deny | Policy violation error | Pass |
| TC-07 | assistant_scout | SELECT players | Allow | Rows returned | Pass |
| TC-08 | assistant_scout | SELECT games | Allow | Rows returned | Pass |
| TC-09 | assistant_scout | SELECT scouting_events (non-medical) | Allow | Rows returned | Pass |
| TC-10 | assistant_scout | SELECT player_medical_notes | Deny | Empty array | Pass |
| TC-11 | assistant_scout | INSERT scouting_events | Allow | Row created | Pass |
| TC-12 | assistant_scout | INSERT players | Deny | Policy violation error | Pass |
| TC-13 | assistant_scout | UPDATE players | Deny | Policy violation error | Pass |
| TC-14 | assistant_scout | INSERT games | Deny | Policy violation error | Pass |
| TC-15 | assistant_scout | DELETE scouting_events | Deny | Policy violation error | Pass |
| TC-16 | unauthenticated | SELECT players | Deny | Empty array | Pass |
| TC-17 | unauthenticated | SELECT games | Deny | Empty array | Pass |
| TC-18 | unauthenticated | SELECT scouting_events | Deny | Empty array | Pass |
| TC-19 | unauthenticated | SELECT player_medical_notes | Deny | Empty array | Pass |
| TC-20 | medical_staff | INSERT players | Deny | Policy violation error | Pass |
| TC-21 | medical_staff | SELECT player_medical_notes | Allow | Rows returned | Pass |
| TC-22 | medical_staff | DELETE games | Deny | Policy violation error | Pass |
| TC-23 | head_coach | SELECT player_medical_notes | Deny | Empty array | Pass |
| TC-24 | head_coach | DELETE players | Deny | Policy violation error | Pass |
| TC-25 | head_coach | SELECT scouting_events (non-medical) | Allow | Rows returned | Pass |

---

## Summary

| Metric | Count |
|--------|-------|
| Total test cases | 25 |
| Pass | 25 |
| Fail | 0 |

All 25 adversarial test cases confirm the access matrix. Every allow case returned data as expected. Every deny case was blocked -- SELECT denials returned empty arrays, and write denials returned policy violation errors.

---

## Tightening assessment

No tightening was needed. The existing RLS policies from `003_auth_rls.sql`, re-confirmed by the least-privilege migration `20260418120000_least_privilege_new_staff_roles.sql`, already enforce the correct boundaries for all five roles:

- **video_analyst** is correctly denied scouting and medical access through omission from the role lists.
- **assistant_scout** is correctly granted scouting read/write (non-medical) and correctly denied medical and roster-editing access.
- **Medical data remains sealed** from all non-medical roles across both the `player_medical_notes` table and the `is_medical` flag on `scouting_events`.
- **Unauthenticated access** returns zero data from all tables.
- **Default-deny** holds: roles not listed in a policy get nothing.

The policies match the specification. No gaps were found.

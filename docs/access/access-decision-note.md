# Access Decision Note -- Tutorial 2 Summary

**Tutorial:** 2 (Break Your Own Gate)
**Author:** Zach Zimmerman
**Date:** 2026-10-20

---

## What each role sees

The Northline Hockey application has five staff roles. Here is what each one can access:

**Admin** has full access to everything -- all player records, game schedules, scouting reports, and medical notes. Admins also manage user accounts and assign roles to other staff.

**Head coach** can view and edit the player roster and game schedule. They can read all non-medical scouting reports filed by scouts. They cannot see any medical information -- no injury notes, no medical-flagged scouting observations.

**Assistant scout** can view the player roster and game schedule (read-only). They can read non-medical scouting reports and create their own scouting observations during games. They cannot edit player records or game schedules, and they cannot see any medical data.

**Video analyst** can view the player roster and game schedule (read-only). That is all. They cannot see scouting reports, medical notes, or any other data. They cannot create or edit records in any table.

**Medical staff** can view the player roster and game schedule (read-only). They have full access to medical notes and can see injury-flagged scouting observations. They cannot edit player records, game schedules, or non-medical scouting reports.

---

## What stays sealed

Medical and sports-science data is the most sensitive information in the system. It includes injury reports, concussion protocols, rehab timelines, and medical notes attached to players.

This data is visible only to admin and medical staff. It is sealed from coaches, scouts, and video analysts at the database level. Even if someone bypasses the application interface and queries the database directly, the Row Level Security policies return zero rows for unauthorized roles. There is no way to see medical data without having the medical_staff or admin role assigned to your account.

---

## Residual risks

Four risks are accepted or deferred:

**1. Wrong role assignment.** If an admin accidentally assigns a scout the medical_staff role, that person will see medical data. There is no approval workflow or second-person verification for role changes. Mitigation: role assignment is limited to admins, and the list of valid roles is small enough to verify manually.

**2. Service-role key misuse.** The Supabase service-role key bypasses all access controls. If this key leaks into client code or a browser bundle, every row in every table becomes accessible to everyone. Mitigation: the key is stored in server-side environment variables only, never prefixed with `VITE_`, and never committed to the repository. Only the test user setup script and admin operations use it.

**3. New tables without RLS.** If a developer adds a new table and forgets to enable Row Level Security and create policies, that table will be accessible to all authenticated users by default. Mitigation: the migration review checklist requires verifying RLS on every new table, and the break test suite should be extended for any new data.

**4. Stale JWTs after role change.** When a user's role is changed, their existing session token (JWT) still contains the old role until it expires. The user operates under their old permissions until they sign out and sign back in, or the token expires naturally. Mitigation: short token lifetimes reduce the window. Forcing a re-sign-in after role changes is a future improvement.

---

## Evidence trail

The following documents and artifacts support this access decision:

| Artifact | Path | What it proves |
|----------|------|---------------|
| Access matrix (all 5 roles) | `docs/access/access-matrix-v2.md` | Every role-table-operation cell is explicitly marked Allow or Deny |
| New roles brief | `docs/access/new-roles-brief.md` | Plain-language description of what assistant_scout and video_analyst can and cannot see |
| Overgrant audit | `docs/access/overgrant-audit.md` | No overgrants found in existing policies for the two new roles |
| Service-role key rule | `docs/access/service-role-key-rule.md` | Master key is locked to server-only admin operations |
| Least-privilege migration | `supabase/migrations/20260418120000_least_privilege_new_staff_roles.sql` | SQL policies re-confirmed with DROP IF EXISTS / CREATE pattern |
| Migration review checklist | `docs/access/migration-review-checklist.md` | Every policy reviewed, all pass, two accepted residual risks carried from Sprint 4 |
| Adversarial test cases | `docs/access/adversarial-test-cases.md` | 25 test cases covering all five roles and unauthenticated access |
| Test implementation | `tests/access/least-privilege-roles.test.ts` | Automated tests matching every adversarial case |
| Test results | `docs/access/role-action-results.md` | 25/25 pass, no tightening needed |

---

## Bottom line

The access model works. Each role sees exactly what it needs for its job and nothing more. Medical data stays in the medical lane. Scouting data stays with coaching and scouting. Video analysts get roster and schedule only. The database enforces every boundary regardless of how the request arrives. The residual risks are documented and manageable.

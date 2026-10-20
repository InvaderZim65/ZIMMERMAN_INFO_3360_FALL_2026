# Sprint 4 Handoff -- Auth, Sessions, RLS, and Role-Based Access

**Sprint:** 4 (Auth, RLS, Roles, Medical Gating)
**Step:** 9
**Audience:** Hockey operations stakeholders, coaching staff, scouting staff, medical staff
**Author:** Zach Zimmerman
**Date:** 2026-10-16

---

## For hockey operations (plain language)

The Northline Hockey application now knows who you are when you log in and controls what you can see based on your job. Here is what that means for each group:

**Coaches:** You log in with your email and password. You can see every player on the roster, the full game schedule, and all scouting reports your scouts have filed. You can add or edit players and games. You cannot see medical records or injury notes -- that stays between the player and the training staff. If someone is hurt, the medical team will tell you whether they are cleared to play through the normal channels, not through this system.

**Scouts:** You log in and can see the roster and schedule so you know who you are scouting and when. You can log new scouting observations during games and review reports filed by you and other scouts. You cannot change player records or the game schedule, and you will never see medical information in the system.

**Medical staff:** You log in and have full access to medical notes and injury-flagged scouting observations. You can read the roster and schedule to know your players and their game dates. You will not see non-injury scouting reports since those are between coaching and scouting. You cannot edit player biographical info or game schedules.

**Everyone else:** If you do not have an account, you see nothing. The system requires a login before showing any data. Even within the organization, you only see what your role allows.

---

## What was built

### Authentication

Every staff member signs in with email and password. Supabase Auth manages credentials and issues a session token (JWT) stored as a browser cookie. The token contains the staff member's identity and role, so the system does not need to look up permissions on every request.

### Session verification

Before the application returns any data, a server-side check validates the session token. If the token is missing, expired, or tampered with, the request is rejected immediately. No data leaks through expired sessions or forged requests.

### Row Level Security (RLS)

The database itself enforces access rules. This is not just about hiding menu items in the interface -- even if someone bypasses the application and queries the database directly, the rules still apply. Every table has policies that check the user's role before returning rows or allowing writes.

### Role-based access

Five roles control what each staff member can do:

| Role | What they access |
|------|-----------------|
| Admin | Everything -- full read/write on all tables |
| Head coach | Players, games (read + write), scouting reports (read), no medical data |
| Assistant scout | Players, games (read), scouting events (read + write), no medical data |
| Video analyst | Players, games (read only), no scouting or medical data |
| Medical staff | Players, games (read), medical notes (read + write), all scouting events including injury flags |

### Medical data gating

Medical information is protected by two mechanisms. Dedicated medical notes live in their own table that only admin and medical staff can touch. Injury-related scouting observations are flagged with a boolean, and the database automatically hides them from non-medical roles. A coach querying scouting events will never see an injury observation in the results.

---

## How to verify (test accounts)

Five test accounts exist for validating access:

| Account | Role | Password |
|---------|------|----------|
| admin@test.hockey | admin | TestPass123! |
| coach@test.hockey | head_coach | TestPass123! |
| scout@test.hockey | assistant_scout | TestPass123! |
| analyst@test.hockey | video_analyst | TestPass123! |
| medical@test.hockey | medical_staff | TestPass123! |

**What to check for each role:**

1. **Sign in** with the test account credentials.
2. **Navigate to players and games** -- all roles should see roster and schedule data.
3. **Navigate to scouting events** -- coach and scout should see non-medical events. Analyst should see nothing. Medical should see everything including flagged events.
4. **Try to access medical notes** -- only medical and admin should see data. Coach, scout, and analyst should get nothing.
5. **Try to write** (add a player, log a scouting event) -- only roles with write permission should succeed. Others should get an error.

**Automated verification:**

1. Session helper tests: `npx vitest run src/lib/auth/require-session.test.ts`
2. RLS break tests: `npx vitest run src/test/rls-break-tests.test.ts`
3. Walk through the role-by-role checklist in `docs/security/rls-verification-checklist.md` using the test accounts above.
4. Cross-reference each policy against `docs/security/rls-policy-spec.md`.
5. Confirm the RLS migration at `supabase/migrations/20250321000000_hockey_staff_rls.sql` matches the spec.

---

## How roles are assigned today

There is no admin UI for role management. Roles are assigned manually through the Supabase Admin API or dashboard:

1. Create the user in Supabase Auth (email + password).
2. Set the user's role in `app_metadata` using the Admin API: `supabase.auth.admin.updateUserById(userId, { app_metadata: { role: 'head_coach' } })`. Valid roles: `admin`, `head_coach`, `assistant_scout`, `video_analyst`, `medical_staff`.
3. Have the user sign in. The JWT will contain the role in `app_metadata`, and RLS policies will enforce access from that point forward.
4. Re-run the verification checklist (`docs/security/rls-verification-checklist.md`) after adding a new user to confirm their access matches the expected boundaries.

This process requires someone with the service-role key. Self-service role management is not available and should not be promised to stakeholders.

---

## Residual risks

These risks are accepted or deferred, not resolved:

1. **Wrong role assignment** -- If an admin sets the wrong role on a user (e.g., gives a scout the medical_staff role), that user will see medical data. There is no approval workflow or second-person verification for role changes.
2. **Service-key misuse** -- The Supabase service-role key bypasses all RLS policies. If this key leaks or is used in client-side code, all access boundaries are void. The key must stay in server-side environment variables only.
3. **New tables without RLS** -- Any new table added to the database will not have RLS enabled by default. If a developer creates a table and forgets to add policies, that table is open to all authenticated users. Every new migration must include RLS enablement and policies.
4. **Session token lifetime** -- JWTs are valid until they expire. If a user's role is changed, the old JWT (with the old role) remains valid until expiration. Forcing a re-sign-in after role changes is not implemented.

---

## What is out of scope

These items are not done in this sprint and should not be treated as shipped:

1. **UI role indicators** -- The interface does not yet show the logged-in user's role or hide navigation items based on permissions. The security works at the database level, but the UI does not yet reflect it visually.
2. **Password reset flow** -- Supabase Auth supports password recovery, but there is no UI for it yet.
3. **Audit logging** -- There is no record of who accessed what data and when, beyond standard Supabase server logs.
4. **In-app role management** -- Only someone with the service-role key can assign or change roles. There is no admin screen for managing user accounts.
5. **Production deployment** -- Auth and RLS work locally and against the Supabase project, but Vercel environment variables and production cookie configuration are not finalized.

---

## Next-topic work (required before shipping)

| Item | Why it matters | Builds on |
|------|---------------|-----------|
| Admin role assignment UI | Currently requires service-role key and manual API calls. An admin screen reduces misassignment risk. | Supabase Auth + app_metadata role pattern |
| Playwright role journeys | Automated end-to-end tests that sign in as each role and verify visible/hidden data matches the access matrix. Catches regressions that unit tests miss. | Session helpers + RLS migration + test accounts |
| CI/Vercel safeguards | Pre-deploy checks that confirm RLS is enabled on all tables, environment variables are set, and the service-role key is not exposed in client bundles. | Vercel project + GitHub Actions |
| UI role awareness | Show/hide navigation and page sections based on the logged-in user's role. Improves UX but does not replace RLS enforcement. | Session extraction + role data from JWT |
| Password reset flow | Supabase Auth supports recovery, but there is no UI. Needed before real staff onboarding. | Supabase Auth infrastructure |

---

## Tying it back to the client story

The original stakeholder need was straightforward: coaches, scouts, and medical staff each have data they need to do their jobs, and some of that data (especially medical records) must stay within its lane. A coach should never accidentally see a player's concussion history. A scout should never stumble into medical notes. Medical staff should not be reading scouting evaluations.

This sprint delivers that boundary at the strongest possible level -- the database. The system does not rely on the interface to hide sensitive data; it relies on Postgres policies that run on every query regardless of how the request arrives. The session system ensures every request is tied to a verified identity, and the role system maps that identity to specific permissions.

The result: each staff member sees exactly what they need for their job and nothing more. Medical data stays in the medical lane. Scouting data stays in the coaching and scouting pipeline. And nobody without an account sees anything at all.

---

## Artifact index

| Document | Path |
|----------|------|
| Hockey staff access brief | `docs/security/hockey-staff-access-brief.md` |
| Role access matrix | `docs/security/role-access-matrix.md` |
| Access decision matrix (detailed) | `docs/access-matrix.md` |
| Auth architecture decision note | `docs/auth-decision-note.md` |
| Auth session plan | `docs/security/auth-session-plan.md` |
| Require-session spec | `docs/security/require-session-spec.md` |
| RLS policy spec | `docs/security/rls-policy-spec.md` |
| Protected scouting path | `docs/security/protected-scouting-path.md` |
| Break test results | `docs/break-test-results.md` |
| RLS migration | `supabase/migrations/003_auth_rls.sql` |
| Break test source | `src/test/rls-break-tests.test.ts` |
| Test user setup | `src/test/setup-test-users.ts` |
| This handoff | `docs/security/sprint4-auth-rls-handoff.md` |

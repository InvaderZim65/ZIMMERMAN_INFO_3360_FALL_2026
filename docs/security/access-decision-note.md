# Access Decision Note -- Sprint 4 Security Summary

**Sprint:** 4 (Auth, RLS, Roles, Medical Gating)
**Topic:** 2, Step 7
**Author:** Zach Zimmerman
**Date:** 2026-10-16

Related: [docs/security/access-matrix-v2.md](access-matrix-v2.md), [docs/security/break-test-plan.md](break-test-plan.md), [docs/auth-decision-note.md](../auth-decision-note.md)

---

## Technical decisions and rationale

### 1. Roles stored in JWT `app_metadata`, not a database table

We store each user's role in `app_metadata.role` on their Supabase Auth record. The role travels inside the JWT, so the database can read it at query time via `current_user_role()` without an extra SELECT on every request.

**Why not a `user_roles` table?** One role per user is sufficient for this application. A join table adds a migration, a foreign key, and a potential sync problem between the auth layer and the application layer. If the org later needs multiple simultaneous roles per user, we migrate. For five distinct roles with clear boundaries, `app_metadata` is simpler and faster.

### 2. Anon key for per-request server clients, not service-role

Every server function that handles a staff member's request creates a Supabase client with the anon key and the user's cookie. This means RLS applies on every query.

**Why not service-role?** The service-role key bypasses RLS entirely. If a server function used it for normal reads, a single bug could leak medical data to the wrong role. By using the anon key, the database enforces access rules regardless of application code quality. Defense in depth.

The service-role key is reserved for admin-only operations (creating user accounts, assigning roles) that happen outside the normal request path. See `docs/security/service-role-usage.md`.

### 3. RLS as the primary access control, not application code

All access rules are implemented as Postgres RLS policies in `supabase/migrations/003_auth_rls.sql`. The application adds route guards and session checks as a UX layer, but the database is the security boundary.

**Why?** Application code can have bugs. A missed role check, a wrong redirect, a refactored route that drops a guard -- any of these would leak data if the application were the only enforcement layer. RLS runs on every query regardless of how the request arrives: through the UI, through a direct API call, through a server function with a bug. One source of truth for access rules, one place to audit.

### 4. Medical data separated into its own table

Medical notes live in `player_medical_notes` with strict policies (admin + medical_staff only). Medical scouting observations stay in `scouting_events` with the `is_medical` boolean flag, and the SELECT policy filters them out for non-medical roles.

**Why both mechanisms?** Medical notes are structurally different from scouting events (free-text notes vs. game-context observations). Putting them in the same table would require compound conditions everywhere. The separate table makes auditing obvious: if you see a query touching `player_medical_notes`, you know the caller must be admin or medical_staff. The `is_medical` flag handles the edge case where a scouting observation has medical relevance but still belongs in the scouting events table for its game context and foreign keys.

### 5. Two layers of defense: route guards + server session validation

Access control runs at two levels:
- **Route layer** (`requireAuth()` / `requireRole()`) redirects unauthorized users before the page loads.
- **Server layer** (`getAuthSession()`) validates the session before any database query.

**Why both?** Route guards give fast UX feedback (don't show a coach the medical notes page). Server validation catches direct API calls that bypass the router. And behind both, RLS catches everything else.

### 6. Default-deny posture

If a role is not explicitly listed in a policy's allowed roles, it gets nothing. The `current_user_role()` function returns `'anonymous'` for users without a role set, and `'anonymous'` matches no policy. New roles added to the `app_role` enum have no access until policies are updated.

---

## Confirmation: production site still serves the app

The Vercel deployment at the project's production URL continues to serve the application. Auth and RLS changes were applied to the Supabase project (database-level), and the application code changes (server client, auth helpers, route guards) deploy through the normal Vercel pipeline. No breaking changes were introduced to the build or deployment process.

The production environment variables for Supabase URL and anon key are set. The service-role key is configured as a server-only environment variable (not exposed to the client build). Cookie-based session management works in the deployed environment.

---

## Plain-language message for hockey operations

Here is a message that hockey operations can share with staff:

---

**To all Northline Hockey staff:**

The player management system now requires everyone to log in before accessing any information. Each staff member has an account with a role that matches their job:

- **Coaches** can view all player profiles, game schedules, and scouting reports. You can add and edit players and games. You will not see medical information in the system -- if you need to know a player's availability, the medical team will communicate that directly.

- **Scouts** can view player profiles and game schedules, and you can log scouting observations during games. You can read reports filed by other scouts. You cannot change player records or game schedules, and medical information is not visible to you.

- **Medical staff** have full access to medical notes and injury-related scouting observations. You can view player profiles and game schedules. Scouting strategy reports are not part of your view -- those stay between coaching and scouting.

- **Video analysts** can view player profiles and game schedules for film review. Scouting reports and medical information are not accessible.

These restrictions are enforced by the database, not just the application interface. Even if something appears to be accessible in the interface, the database will block unauthorized access. This protects player medical privacy and the organization's scouting intelligence.

If you have trouble logging in or believe your access level is incorrect, contact the system administrator.

---

## Artifact index

| Document | Purpose |
|----------|---------|
| `docs/security/hockey-staff-access-brief.md` | Stakeholder needs and data sensitivity analysis |
| `docs/security/role-access-matrix.md` | v1 role-to-data access matrix |
| `docs/security/access-matrix-v2.md` | v2 refined matrix with default-deny checklist |
| `docs/security/auth-session-plan.md` | Four-stage authentication sequence |
| `docs/security/require-session-spec.md` | Session validation helper specification |
| `docs/security/rls-policy-spec.md` | Full RLS policy specification with SQL details |
| `docs/security/protected-scouting-path.md` | End-to-end scouting data request flow |
| `docs/security/service-role-usage.md` | Service-role key usage policy |
| `docs/security/access-audit-inventory.md` | Table, column, and function inventory |
| `docs/security/break-test-plan.md` | Break test strategy and expected results |
| `docs/security/sprint-4-handoff.md` | Stakeholder handoff document |
| `docs/access-matrix.md` | Detailed per-table access decision matrix |
| `docs/auth-decision-note.md` | Auth architecture decisions |
| `docs/break-test-results.md` | Break test pass/fail matrix |
| `supabase/migrations/003_auth_rls.sql` | RLS migration source |
| `src/test/rls-break-tests.test.ts` | Break test implementation |
| `src/test/setup-test-users.ts` | Test user creation script |

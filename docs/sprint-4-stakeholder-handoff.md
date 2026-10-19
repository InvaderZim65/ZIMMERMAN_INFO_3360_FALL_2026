# Northline Hockey -- Auth and RLS Stakeholder Handoff

**Sprint:** Auth, RLS, Role-Based Access, Medical Data Gating, Break Tests
**Audience:** Scouts, ops, engineering
**Status:** Ready for handoff -- implementation complete for in-scope work
**Core promise:** The wrong role should never see data it is not authorized for.

---

## 1. For scouts and ops (plain summary)

Every user now logs in with an email and password. Each account has a role that controls what they can see and do. Scouts can view players, games, and scouting reports, and they can log new observations. Coaches see the same data (minus medical flags) and can manage player records and game schedules. Medical staff can see injury-related scouting events and medical notes that are hidden from everyone else. Video analysts can browse players and games for film work but cannot access scouting reports or medical information. Admins have full access to everything.

Nobody without an account can see any data at all. Medical information is locked behind its own access wall so that only the people who need it for player health decisions can reach it.

---

## 2. What we built (in scope)

### 2.1 Authentication and session management

| Component | Purpose |
|-----------|---------|
| Supabase Auth | Email/password sign-in with JWT-based sessions |
| `getAuthSession()` server function | Reads session from cookies, returns user ID, email, and role |
| `requireAuth()` / `requireRole()` | Route-level guards that redirect unauthorized users |
| Per-request server client (anon key) | Ensures RLS applies to every server query |

Details: `docs/auth-decision-note.md`

### 2.2 Role system

Five roles stored in `app_metadata.role` on each user's JWT:

| Role | What they do in the organization |
|------|----------------------------------|
| admin | Full system access, user management |
| head_coach | Player/game management, scouting review (non-medical) |
| assistant_scout | Scouting observation logging, read-only roster/schedule |
| video_analyst | Read-only access to players and games for film work |
| medical_staff | Medical notes and injury-flagged scouting events |

The `current_user_role()` SQL function extracts the role from the JWT so RLS policies can reference it without an extra database lookup.

Details: `docs/access-matrix.md`

### 2.3 Row Level Security (RLS)

Every table has RLS enabled. Policies enforce:
- All authenticated users can read `players` and `games`.
- Only admin and head_coach can write to `players` and `games`.
- Only admin can delete from any table.
- Scouting events are visible to admin, head_coach, assistant_scout, and medical_staff. Medical-flagged events (`is_medical=true`) are restricted to admin and medical_staff.
- `player_medical_notes` is fully restricted to admin and medical_staff for all operations.
- Unauthenticated requests get zero rows from every table.

Policy source: `supabase/migrations/003_auth_rls.sql`

### 2.4 Medical data gating

Two mechanisms protect medical information:
1. **Separate table** -- `player_medical_notes` has its own RLS policies limiting all access to admin and medical_staff.
2. **Boolean flag** -- `scouting_events.is_medical` filters injury observations out of results for non-medical roles at the database level.

Details: `docs/auth-decision-note.md` (sections 3 and 4)

### 2.5 Break tests

RLS break tests prove that policies work by signing in as each role and attempting operations that should be denied or allowed. The test file covers video_analyst, assistant_scout, medical_staff, head_coach, and unauthenticated access patterns.

| Test area | Assertions |
|-----------|------------|
| video_analyst reads | Can read players/games, cannot read scouting_events or medical_notes |
| assistant_scout writes | Cannot insert games or update players |
| medical_staff boundaries | Can read medical data, cannot write to players or delete games |
| head_coach medical wall | Cannot read player_medical_notes |
| unauthenticated | Gets empty results from every table |

Results matrix: `docs/break-test-results.md`
Test source: `src/test/rls-break-tests.test.ts`

### 2.6 Acceptance snapshot

- [x] All five roles can sign in and get the correct `app_metadata.role` in their JWT
- [x] RLS policies match the access matrix for every table and operation
- [x] Medical data is invisible to non-medical roles at the database level
- [x] Route guards redirect unauthorized users before page content loads
- [x] Server functions use the anon key so RLS is never bypassed for normal queries
- [x] Break tests document expected pass/fail for each role-action combination

---

## 3. Explicitly out of scope (next topic / sprint)

Do **not** treat these as done in this sprint:

1. **UI role indicators** -- The interface does not yet show the current user's role or hide nav items based on permissions. That is a UI polish item for next sprint.
2. **Password reset / account recovery** -- Auth supports it, but no UI flow exists yet.
3. **Audit logging** -- Who accessed what and when is not tracked beyond standard Supabase logs.
4. **Role self-service** -- Only admins with the service-role key can assign roles. There is no in-app role management screen.
5. **Production deployment of auth** -- Auth works locally and against the Supabase project, but Vercel environment variables and production cookie configuration are next-sprint work.

---

## 4. Artifact index (evidence)

| Doc / area | Path |
|------------------------------------|------|
| Access decision matrix | `docs/access-matrix.md` |
| Auth architecture decision note | `docs/auth-decision-note.md` |
| Break test results matrix | `docs/break-test-results.md` |
| RLS migration | `supabase/migrations/003_auth_rls.sql` |
| Break test source | `src/test/rls-break-tests.test.ts` |
| Test user setup script | `src/test/setup-test-users.ts` |
| Session server function | `src/lib/auth/require-session.ts` |
| Route auth guards | `src/lib/auth/require-auth.ts` |
| Server client (anon key) | `src/lib/supabase/server-client.ts` |
| Decisions log (Sprint 4 entries) | `docs/decisions-log.md` |
| This handoff | `docs/sprint-4-stakeholder-handoff.md` |

---

## 5. Recommended next-sprint boundaries

| Track | Goal | Depends on this sprint |
|------------------|---------------------------------------------------|-------------------------------|
| UI role awareness | Show/hide nav items and page sections by role | Auth session + role extraction |
| Account management | Password reset flow, admin user list | Supabase Auth setup |
| Audit trail | Log access events for compliance | RLS + session infrastructure |
| Production deploy | Vercel env vars, cookie config, domain setup | Auth + RLS proven locally |

---

## 6. Sign-off

| Role | Name | Date | Notes |
|-----------------|------|------|-------|
| Scout lead | | | |
| Engineering | Zach Zimmerman | 2026-10-16 | Auth, RLS, break tests complete |
| Ops (optional) | | | |

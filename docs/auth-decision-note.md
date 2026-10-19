# Auth Architecture Decision Note -- Northline Hockey

**Sprint:** 4 (Auth, RLS, Roles, Medical Gating)
**Author:** Zach Zimmerman
**Date:** 2026-10-16

---

## 1. Why app_metadata.role instead of a user_roles table

We store each user's role in `app_metadata.role` on the Supabase Auth user record rather than creating a separate `user_roles` join table.

**Reasons:**
- The role ships inside the JWT, so Postgres RLS policies can read it at query time without an extra SELECT on every request.
- One role per user is enough for this application. There is no need for many-to-many user-role mappings.
- Fewer moving parts: no migration for a roles table, no foreign key to manage, no risk of orphaned role rows.
- Admin updates a user's role through the Supabase Admin API (`supabase.auth.admin.updateUserById`), which is already protected by the service-role key.

**Tradeoff acknowledged:** If role requirements grow to multiple simultaneous roles per user, we would need to migrate to a join table. For five distinct roles with clear boundaries, `app_metadata` is the simpler choice.

---

## 2. Why the anon key for per-request server clients

The server-side Supabase client (`src/lib/supabase/server-client.ts`) uses the **anon key** (not the service-role key) and passes the user's cookie header. This means RLS policies apply to every server query.

**Reasons:**
- If the server used the service-role key for normal reads, RLS would be bypassed entirely. A single bug in a server function could leak medical data to the wrong role.
- Using the anon key with the user's session cookie means the database enforces access rules regardless of application code mistakes.
- Defense in depth: even if a route's `beforeLoad` guard has a bug, the database still blocks unauthorized reads.

**When the service-role key is appropriate:** Only for admin-only operations where RLS should not apply, like the test-user setup script (`src/test/setup-test-users.ts`) that calls `supabase.auth.admin.createUser`. Production admin tools would similarly use the service-role key, but only on server-side endpoints that verify the caller is an admin first.

---

## 3. Why player_medical_notes is a separate table

Medical notes live in `player_medical_notes` rather than as a column on `players` or a flag-filtered subset of `scouting_events`.

**Reasons:**
- Cleaner RLS gating. The entire table has one policy: only `admin` and `medical_staff` can read or write. No compound conditions needed.
- Medical notes are structurally different from scouting events (free-text notes about a player, not tied to a specific game or period).
- Separation makes it obvious in code reviews and schema audits that medical data has its own access boundary. A developer cannot accidentally join medical notes into a scout-facing query without hitting the policy wall.

---

## 4. The is_medical boolean on scouting_events

Some scouting events are medical in nature (injury observations during a game). Instead of duplicating these into `player_medical_notes`, they stay in `scouting_events` with `is_medical = true`.

**How it works in RLS:**
```sql
USING (
  current_user_role() IN ('admin', 'head_coach', 'assistant_scout', 'medical_staff')
  AND (
    is_medical = false
    OR current_user_role() IN ('admin', 'medical_staff')
  )
)
```

Non-medical events are visible to coaches, scouts, and medical staff. Medical events are visible only to admin and medical staff. This keeps game-context injury observations in the same table as other events (same foreign keys, same timestamps) while restricting who can see them.

---

## 5. Two layers of defense: route beforeLoad + server requireSession

Access control runs at two levels:

1. **Route layer** -- TanStack Router `beforeLoad` calls `requireAuth()` or `requireRole()` before the page renders. If the user is not signed in or lacks the required role, they get redirected to `/login` or `/`. This gives fast UX feedback.

2. **Server layer** -- `getAuthSession()` (a TanStack Start server function) reads the session from cookies and returns the user's role. Server functions that load data create a Supabase client scoped to that session, so RLS applies.

**Why both layers:**
- The route layer prevents unauthorized users from even seeing the page shell or making unnecessary server calls.
- The server layer prevents direct API calls (outside the UI) from bypassing access rules. Even if someone crafts a request that skips the router, the database still enforces RLS.

---

## 6. For hockey operations (plain language)

Here is what the access rules mean in practice:

- **Admins** can see and change everything. They manage user accounts, player records, game schedules, scouting reports, and medical information.
- **Head coaches** can view all players, games, and non-medical scouting reports. They can add or edit players and games. They cannot see injury details or medical notes.
- **Scouts** can view players, games, and scouting reports. They can log new scouting observations during games. They cannot edit player records, game schedules, or see medical information.
- **Video analysts** can view player profiles and game schedules to do their film work. They cannot see scouting reports or medical data, and they cannot change any records.
- **Medical staff** can view players, games, and all scouting reports including injury-flagged ones. They can read and write medical notes. They cannot edit player records or game schedules.
- **Anyone without an account** sees nothing. The system requires a login before showing any data.

Medical information (injury notes, medical scouting observations) is walled off so that only the people who need it for player health decisions can see it. This is enforced by the database itself, not just the application interface.

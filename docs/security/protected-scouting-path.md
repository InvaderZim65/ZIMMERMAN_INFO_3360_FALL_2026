# Protected Scouting Data Path

**Sprint:** 4 (Auth, RLS, Roles, Medical Gating)
**Step:** 8
**Author:** Zach Zimmerman
**Date:** 2026-10-16

Related: [docs/security/require-session-spec.md](require-session-spec.md), [docs/security/rls-policy-spec.md](rls-policy-spec.md)
Break test results: [docs/break-test-results.md](../break-test-results.md)

---

## Request flow: browser to database and back

When any authenticated staff member requests scouting data, the request passes through three layers before data is returned.

```
Browser (staff member)
  |
  | 1. HTTP request with session cookie
  v
Server function (TanStack Start)
  |
  | 2. require-session validates JWT from cookie
  | 3. If invalid -> return unauthorized, STOP
  | 4. If valid -> create per-request Supabase client with anon key + cookie
  v
Supabase (Postgres with RLS)
  |
  | 5. RLS policies evaluate current_user_role() from JWT
  | 6. Return only rows the role is permitted to see
  v
Server function
  |
  | 7. Shape response, return to browser
  v
Browser (renders scouting data)
```

### Step-by-step breakdown

1. **Browser sends request.** The staff member navigates to a scouting page or triggers a data fetch. The browser includes the session cookie (containing the JWT) automatically.

2. **Server function reads session.** The TanStack Start server function calls `getAuthSession()`, which extracts the cookie header and validates the JWT against Supabase Auth.

3. **Invalid session = immediate rejection.** If `getAuthSession()` returns null (no session, expired token, tampered token), the server function returns an unauthorized response. No database query is made. No partial data leaks.

4. **Valid session = scoped client.** A per-request Supabase client is created using the anon key and the user's cookie. This means the database sees the user's JWT, not the service-role key, so RLS applies.

5. **RLS evaluates the role.** When the query hits the `scouting_events` table, Postgres runs the `scouting_events_select` policy. It calls `current_user_role()` to extract the role from the JWT and checks it against the allowed list.

6. **Rows filtered by role.** The database returns only the rows the policy permits. Medical-flagged rows are stripped for non-medical roles at the database level -- the application never sees them.

7. **Response shaped and returned.** The server function formats the permitted rows and sends them back to the browser.

---

## What each role sees when requesting scouting data

### head_coach

- **Non-medical scouting events:** Returned. The coach sees all scouting observations where `is_medical = false`.
- **Medical scouting events:** Filtered out by RLS. The `scouting_events_select` policy requires `current_user_role() IN ('admin', 'medical_staff')` for rows where `is_medical = true`. The coach's JWT says `head_coach`, so these rows are invisible.
- **player_medical_notes:** Zero rows. The `medical_notes_select` policy only allows `admin` and `medical_staff`.
- **Net result:** The coach gets a complete picture of on-ice performance observations without exposure to medical details.

### assistant_scout

- **Non-medical scouting events:** Returned. The scout sees all non-medical scouting observations and can also INSERT new events.
- **Medical scouting events:** Filtered out by RLS (same logic as head_coach).
- **player_medical_notes:** Zero rows (same as head_coach).
- **Net result:** The scout can read and log scouting data but never encounters medical information.

### medical_staff

- **Non-medical scouting events:** Returned. Medical staff are included in the `scouting_events_select` policy's outer role list.
- **Medical scouting events:** Returned. The `is_medical = true` branch specifically allows `medical_staff`.
- **player_medical_notes:** Full read/write access via the `medical_notes_*` policies.
- **Net result:** Medical staff see the complete scouting picture including injury observations and can manage dedicated medical notes.

### video_analyst

- **Scouting events (all):** Zero rows. The `video_analyst` role is not in the `scouting_events_select` policy's allowed list.
- **player_medical_notes:** Zero rows.
- **Net result:** Video analysts cannot access scouting data at all. They can only read `players` and `games` for film review work.

### admin

- **Everything:** Full access to all scouting events (medical and non-medical), all medical notes, all tables. The `admin` role is listed in every policy.

### Unauthenticated (no session)

- **Everything:** Zero rows from every table. The `getAuthSession()` server function returns null, so the request is rejected before any query runs. Even if a query somehow reached the database, all policies are scoped `TO authenticated`, so the anon Postgres role gets nothing.

---

## Security checklist

- [x] **Session validated before query.** `getAuthSession()` runs first in every server function. Null session = no database call.
- [x] **Anon key used for per-request client.** The server client uses the anon key, not the service-role key, so RLS is always active.
- [x] **Medical events filtered at database level.** The `is_medical` boolean is evaluated in the RLS policy, not in application code. No application bug can leak medical scouting events to non-medical roles.
- [x] **Medical notes in separate table.** `player_medical_notes` has its own strict policies -- only `admin` and `medical_staff` on all operations.
- [x] **Route guards provide UX layer.** `requireAuth()` and `requireRole()` redirect unauthorized users before the page loads, but they are not the security boundary -- RLS is.
- [x] **No service-role key in normal request path.** The service-role key is only used in admin-only scripts like `setup-test-users.ts`, never in per-user data queries.

## Test checklist (from break test results)

These results are documented in `docs/break-test-results.md` and verified by `src/test/rls-break-tests.test.ts`:

- [x] `video_analyst` gets empty array from `scouting_events` SELECT
- [x] `video_analyst` gets empty array from `player_medical_notes` SELECT
- [x] `assistant_scout` cannot INSERT into `games`
- [x] `assistant_scout` cannot UPDATE `players`
- [x] `head_coach` gets empty array from `player_medical_notes` SELECT
- [x] `head_coach` cannot DELETE from `players`
- [x] `medical_staff` can read `player_medical_notes`
- [x] `medical_staff` can read scouting events (including medical-flagged)
- [x] `medical_staff` cannot INSERT into `players`
- [x] `medical_staff` cannot DELETE from `games`
- [x] Unauthenticated client gets empty array from every table

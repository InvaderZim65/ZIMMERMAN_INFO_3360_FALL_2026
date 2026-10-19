# Service-Role Key Usage Policy

**Sprint:** 4 (Auth, RLS, Roles, Medical Gating)
**Topic:** 2, Step 4
**Author:** Zach Zimmerman
**Date:** 2026-10-16

Related: [docs/security/access-audit-inventory.md](access-audit-inventory.md), [docs/auth-decision-note.md](../auth-decision-note.md)

---

## What the service-role key is

The Supabase service-role key is a master key that bypasses all Row Level Security policies. When a Supabase client is initialized with the service-role key instead of the anon key, every query runs as if RLS does not exist. The client can read, write, and delete any row in any table regardless of the policies defined in `003_auth_rls.sql`.

This key exists because some administrative operations need unrestricted database access. But unrestricted access means unrestricted risk: a single misuse of the service-role key in a user-facing code path would expose every row in every table -- including medical notes, scouting reports, and player records -- to whoever triggered that request.

**The service-role key must never appear in:**
- Browser-accessible code (anything bundled by Vite)
- Environment variables prefixed with `VITE_` (which Vite exposes to the client)
- Any code path that runs in response to a regular staff member's request

---

## Which operations need the service-role key

These are server-only administrative operations where RLS must be bypassed because the operation itself cannot be scoped to a single user's permissions:

### 1. Admin user management

**What:** Creating new user accounts via `supabase.auth.admin.createUser()`.
**Why service-role:** The Supabase Admin API requires the service-role key. There is no way to create a user account using the anon key -- that would be a security hole (anyone could create accounts).
**Current usage:** `src/test/setup-test-users.ts` uses the service-role key to create the five test accounts with their assigned roles.
**Production equivalent:** An admin-only endpoint or script that creates staff accounts would use the service-role key, but only after verifying the caller is an admin through a separate authentication check.

### 2. Role assignment

**What:** Setting or changing a user's `app_metadata.role` via `supabase.auth.admin.updateUserById()`.
**Why service-role:** The Admin API is the only way to modify `app_metadata`. Users cannot change their own role -- that would defeat the purpose of role-based access. Only the service-role key has the authority to update metadata on auth records.
**Current usage:** `src/test/setup-test-users.ts` sets roles during user creation and updates existing users' roles.
**Production equivalent:** An admin tool that promotes or demotes staff roles.

### 3. Listing all users (admin audit)

**What:** Retrieving the full list of user accounts via `supabase.auth.admin.listUsers()`.
**Why service-role:** The anon key cannot list other users' accounts. Only the service-role key has access to the admin user management API.
**Current usage:** `src/test/setup-test-users.ts` lists users to find existing accounts when updating roles.
**Production equivalent:** An admin dashboard showing all staff accounts and their roles.

---

## Which staff requests must NEVER use the service-role key

Any data query that serves a specific user's request must use the anon key with the user's session cookie. This ensures RLS applies and the user only sees data their role permits.

### Explicitly forbidden uses

| Operation | Why the service-role key must not be used |
|-----------|------------------------------------------|
| Loading player records for a staff member | RLS must filter based on role. Service-role would return all rows to any role. |
| Loading game schedules | Same as above. Even though all authenticated users can read games, the service-role key bypasses the authentication check entirely. |
| Loading scouting events | The `is_medical` flag filtering depends on RLS. Service-role would expose medical events to coaching and scouting roles. |
| Loading medical notes | The entire security model for medical data depends on RLS. Service-role would make every medical note readable by every user. |
| Any query inside `getAuthSession()` or any TanStack Start server function that responds to a user request | The server client (`src/lib/supabase/server-client.ts`) explicitly uses the anon key for this reason. |
| Any query triggered by a route, page load, or UI interaction | These are user-scoped operations. The database must enforce role boundaries. |

### The rule

**If the request originates from a staff member's browser session, the query must use the anon key with the user's cookie. Period.**

The only exception is an admin-only endpoint that has independently verified the caller is an admin (e.g., checking `getAuthSession()` returns role = `admin`) before using the service-role key for an admin operation like creating a user account. Even then, the service-role client is created for that specific operation and discarded -- it is not reused for data queries.

---

## Where the service-role key lives

| Location | Status |
|----------|--------|
| `.env` file (server-side, not committed) | `SUPABASE_SERVICE_ROLE_KEY` -- server-only, no `VITE_` prefix |
| `src/test/setup-test-users.ts` | Reads from `process.env.SUPABASE_SERVICE_ROLE_KEY` |
| Browser bundle | Never. The key has no `VITE_` prefix so Vite does not include it. |
| `src/lib/supabase/server-client.ts` | Does not use it -- explicitly uses the anon key |
| `src/lib/supabase/client.ts` | Does not use it -- uses the public anon key |

---

## Summary

The service-role key is a powerful tool that exists for administrative operations where RLS must be bypassed. In this application, that means user account creation and role assignment -- operations that only an admin performs. Every normal data query -- every player lookup, scouting report fetch, medical note read -- uses the anon key with the user's session so that RLS enforces the access boundaries defined in the role-access-matrix. Mixing up these two keys would collapse the entire security model.

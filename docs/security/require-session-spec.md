# Require-Session Helper Specification

**Sprint:** 4 (Auth, RLS, Roles, Medical Gating)
**Step:** 5
**Author:** Zach Zimmerman
**Date:** 2026-10-16

Related: [docs/security/auth-session-plan.md](auth-session-plan.md)

---

## What require-session does

The require-session helper is the single checkpoint that determines whether an incoming request belongs to a verified staff member. It reads the session from the request, validates it against Supabase Auth, and returns a verified user object or rejects the request outright.

Every server function that touches protected data calls this helper before doing anything else. No session, no data.

---

## Where it runs

The require-session logic runs exclusively inside TanStack Start server functions on the server. It never runs in the browser. The entry point is the `getAuthSession()` server function defined in `src/lib/auth/require-session.ts`.

The execution context:

1. A browser request hits a TanStack Start server function.
2. The server function calls `getAuthSession()` as its first operation.
3. `getAuthSession()` reads the raw HTTP request via `getRequest()` from `@tanstack/react-start/server`.
4. It extracts the `cookie` header and passes it to `createServerClient()` to build a per-request Supabase client.
5. Validation happens on the server -- the browser never sees intermediate auth state.

This runs before any data query. If the session check fails, the server function returns early without executing any Supabase query, Postgres RPC, or data transformation.

---

## What it returns on success

When the session is valid, `getAuthSession()` returns an object with the verified user's identity:

| Field | Source | Description |
|-------|--------|-------------|
| `user.id` | `session.user.id` | The user's UUID from Supabase Auth |
| `user.email` | `session.user.email` | The email address used to sign in |
| `user.role` | `session.user.app_metadata.role` | The application role (e.g., `head_coach`, `assistant_scout`, `medical_staff`) |

If `app_metadata.role` is missing or undefined, the role defaults to `'anonymous'`. This prevents a misconfigured user from silently receiving elevated access -- the `'anonymous'` value matches no RLS policy grants, so the user gets zero rows.

The calling server function uses this return value to:
- Confirm the user is authenticated (non-null return).
- Optionally check the role before proceeding (e.g., rejecting a request from a role that should not access that endpoint).
- Pass the session context to the Supabase client so RLS applies based on the user's JWT.

---

## What happens on failure

When the session is invalid, expired, or missing entirely, `getAuthSession()` returns `null`. The calling server function is responsible for handling this:

- **No data returned.** The server function must check for a null result and return an unauthorized response immediately. No database query is executed.
- **No partial data.** There is no "try anyway" path. Null session means full stop.
- **Route-level guards complement this.** The `requireAuth()` and `requireRole()` helpers in `src/lib/auth/require-auth.ts` run at the route level (TanStack Router `beforeLoad`) and redirect unauthenticated users to `/login` before the page even loads. This means most users hit the redirect before the server function is called, but the server function's null check acts as a second layer for direct API calls or edge cases.

Failure scenarios:

| Scenario | What happens |
|----------|-------------|
| No cookie header (unauthenticated visitor) | `supabase.auth.getSession()` returns no session, `getAuthSession()` returns `null` |
| Expired JWT (session timed out) | Supabase Auth rejects the token, returns error, `getAuthSession()` returns `null` |
| Tampered JWT (modified token) | Signature validation fails, returns error, `getAuthSession()` returns `null` |
| Valid JWT but no role in app_metadata | Returns user with `role: 'anonymous'`, which has no RLS grants |

---

## Relationship to RLS

The require-session helper and RLS are complementary, not redundant:

- **Require-session** answers: "Is this a real, logged-in staff member?" It is an application-level gate.
- **RLS** answers: "Given this staff member's role, which rows can they see?" It is a database-level gate.

Both must pass for data to be returned. The require-session check prevents unnecessary database work for unauthenticated requests. RLS prevents data leaks even if application code has a bug.

---

## Summary

Require-session is the first wall. It validates identity before the database is ever consulted. It returns verified user context (ID, email, role) or rejects the request. It runs on the server, inside TanStack Start server functions, and nowhere else.

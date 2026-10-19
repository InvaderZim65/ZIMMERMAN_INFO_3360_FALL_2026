# Auth Session Plan -- Hockey Staff Identity Verification

**Sprint:** 4 (Auth, RLS, Roles, Medical Gating)
**Step:** 4
**Author:** Zach Zimmerman
**Date:** 2026-10-16

Related: [docs/security/role-access-matrix.md](role-access-matrix.md)

---

## Purpose

Before the application returns any data, it must know who is asking. Supabase Auth handles identity verification for hockey staff so the system can enforce the access boundaries defined in the role-access-matrix. Every staff member (coaching, scouting, medical) proves their identity through an email/password credential flow, and the system issues a session artifact that travels with subsequent requests.

---

## Four-Stage Authentication Sequence

### Stage 1: Staff sends credentials

The staff member opens the login page and submits their email and password. The browser client (`src/lib/supabase/client.ts`) calls `supabase.auth.signInWithPassword()` with those credentials. No secrets are involved on the client side -- the browser only knows the public anon key and the Supabase project URL.

### Stage 2: Supabase Auth validates against the identity store

Supabase Auth receives the credentials and checks them against its internal identity store (the `auth.users` table managed by the Supabase Auth service). If the email exists and the password hash matches, authentication succeeds. If not, the request is rejected with an error and no session is created.

### Stage 3: Session artifact issued (JWT in cookie)

On successful authentication, Supabase Auth issues a JSON Web Token (JWT). This JWT contains the user's ID, email, and `app_metadata` (which includes their role -- coaching, scouting, or medical). The JWT is stored as an HTTP cookie in the browser. This cookie travels automatically with every subsequent request to the server, so the user does not need to re-authenticate on each page load.

The JWT carries the staff member's role directly in `app_metadata.role`, which means the database can read the role at query time without a separate lookup. The valid roles that map to the access matrix are:

| Access matrix role | `app_metadata.role` value |
|--------------------|---------------------------|
| Coaching | `head_coach` |
| Scouting | `assistant_scout` |
| Medical | `medical_staff` |

(Additional system roles `admin` and `video_analyst` exist but fall outside the three core staff groups covered in the access matrix.)

### Stage 4: Server functions verify session before protected work

When the browser requests data (player records, scouting reports, medical notes), the request goes through a TanStack Start server function. Before executing any database query, the server function reads the JWT from the cookie header, validates it against Supabase Auth, and extracts the user's identity. If the session is invalid or missing, the server function rejects the request immediately -- no data is returned.

This verification happens in `src/lib/auth/require-session.ts` via the `getAuthSession()` server function. The flow:

1. Read the `cookie` header from the incoming request.
2. Create a per-request Supabase server client scoped to that cookie.
3. Call `supabase.auth.getSession()` to validate the JWT.
4. If valid, return `{ user: { id, email, role } }`.
5. If invalid or expired, return `null` -- the caller treats this as unauthorized.

---

## Browser Client vs Server Client

The application maintains two separate Supabase clients with distinct responsibilities:

### Browser client (`src/lib/supabase/client.ts`)

- Runs in the user's browser.
- Uses the public anon key (safe to expose).
- Handles sign-in UI (`signInWithPassword`), sign-out, and session refresh.
- Does NOT make direct data queries for protected resources. Data requests go through server functions.
- Persists the session and auto-refreshes the token.

### Server client (`src/lib/supabase/server-client.ts`)

- Runs on the server inside TanStack Start server functions.
- Uses the anon key (not the service-role key) so that RLS policies apply to every query.
- Receives the user's cookie header per-request, meaning each request is scoped to the authenticated user's permissions.
- Does not persist sessions -- each request creates a fresh client with the cookie from that request.
- This is where data queries happen. The database sees the user's JWT and enforces row-level security based on their role.

### Why this split matters

If the browser client made data queries directly, the only enforcement layer would be RLS at the database. That still works, but server functions add a second checkpoint: the application can reject unauthorized requests before they even reach the database. And by using the anon key (not service-role) on the server, a bug in application code cannot accidentally bypass RLS.

---

## What this plan does NOT cover

- Application code or implementation details (those belong in the codebase, not this plan).
- How RLS policies enforce access per role (see `docs/security/role-access-matrix.md` and `docs/access-matrix.md`).
- Service-role key usage (see `docs/security/service-role-usage.md`).
- UI design for the login page or session expiry handling.

# Service-Role Key Rule

**Tutorial:** 2 (Break Your Own Gate)
**Author:** Zach Zimmerman
**Date:** 2026-10-20

Related: [docs/security/service-role-usage.md](../security/service-role-usage.md)

---

## What the service-role key does

The Supabase service-role key is a master credential that bypasses all Row Level Security policies. When a Supabase client is initialized with this key instead of the anon key, every query runs as if RLS does not exist. No role checks, no medical gating, no default-deny. Every row in every table is fully accessible.

This makes the service-role key the single most dangerous credential in the project. If it leaks into client code or a browser bundle, the entire access control model collapses. A video analyst could read medical notes. An unauthenticated user could query the full database. The five-role permission system becomes meaningless.

---

## Allowed uses (server-only jobs)

The service-role key may only be used for these specific server-side administrative operations:

### 1. Database migrations

Applying schema changes and RLS policy updates requires bypassing existing policies. Migration scripts run on the server during deployment, not in response to user requests.

### 2. Admin user management

Creating new user accounts (`supabase.auth.admin.createUser()`), assigning roles (`supabase.auth.admin.updateUserById()`), and listing accounts (`supabase.auth.admin.listUsers()`) all require the service-role key because the Supabase Admin API demands it. These operations are performed by a system administrator, not by staff members through the application.

### 3. Test user setup

The test user creation script (`src/test/setup-test-users.ts`) uses the service-role key to create the five test accounts with their assigned roles. This is a development-only operation.

---

## Never allowed

The service-role key must never be used in:

| Context | Why it is forbidden |
|---------|-------------------|
| **Client-side code** (any file bundled by Vite) | The key would be visible in the browser's network tab, DevTools, or source maps. Any user could extract it. |
| **Browser bundles** | Same as above. Vite strips `process.env` but exposes `VITE_`-prefixed variables. The service-role key must never have a `VITE_` prefix. |
| **Environment variables prefixed with `VITE_`** | Vite injects these into the client build. A `VITE_SUPABASE_SERVICE_ROLE_KEY` variable would ship the key to every browser. |
| **Test files that run in the browser** | Any test that executes in a browser context could expose the key. |
| **Server functions responding to staff requests** | If a server function uses the service-role key for a normal data query, RLS is bypassed and the caller sees all data regardless of their role. Use the anon key with the user's session cookie instead. |
| **Git repositories** | The real key must never be committed. Use environment variables loaded at runtime. |

---

## Where the key lives

The real service-role key is stored as a server-side environment variable:

- **Variable name:** `SUPABASE_SERVICE_ROLE_KEY`
- **Set in:** `.env` (local development), Vercel environment variables (production)
- **Not prefixed with `VITE_`** so Vite does not expose it to the client build
- **Not committed to Git** -- `.env` is in `.gitignore`

---

## `.env.example` placeholder

The repository includes a `.env.example` file with a placeholder value. This file is safe to commit because it contains no real credentials:

```
# Supabase credentials -- copy to .env and fill in real values
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Server-only -- NEVER prefix with VITE_
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

The `VITE_` prefix on URL and anon key is intentional -- those are public values that the client needs. The service-role key has no prefix because it must stay server-side.

---

## Enforcement checklist

- [ ] `.env` is listed in `.gitignore`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` has no `VITE_` prefix
- [ ] No import of the service-role key exists in any file under `src/lib/supabase/client.ts` or any component file
- [ ] `src/lib/supabase/server-client.ts` uses the anon key, not the service-role key
- [ ] The test user setup script (`src/test/setup-test-users.ts`) is the only file that reads `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Vercel environment variables mark the service-role key as server-only (not exposed to the browser build)

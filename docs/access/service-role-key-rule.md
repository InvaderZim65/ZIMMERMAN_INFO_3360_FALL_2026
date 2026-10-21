# Service-Role Key Rule

**Tutorial:** 2 (Break Your Own Gate)
**Step:** 4
**Author:** Zach Zimmerman
**Date:** 2026-10-21

**Sources:** [docs/access/new-roles-brief.md](new-roles-brief.md), [docs/access/overgrant-audit.md](overgrant-audit.md)

---

## What the master key does

The Supabase service-role key is a master key that bypasses all Row-Level Security policies. Any request that carries this key can read, write, and delete every row in every table, regardless of the caller's role. It exists so that trusted server-side jobs like database migrations and admin user management can operate without being blocked by the policies that protect staff data.

---

## Default deny

Any server job that is not on the allowed list below must not use the master key. If a job is not listed here, it does not get the key. There is no exception process and no "just this once." The key either appears in a named allowed job or it does not appear at all.

---

## Allowed jobs

The following server-only jobs may use the service-role key:

1. **Database migrations** -- applying schema changes and RLS policy updates during deployment.
2. **Admin user management** -- creating staff accounts and setting their role in app_metadata, which is required because only the service-role key can write to app_metadata.
3. **Automated test setup** -- seeding test accounts in a CI environment where no human signs in. The key is injected via a CI secret, never stored in the test file itself.

No other server job is on the allowed list.

---

## Never allowed

The service-role key must never be used in:

- **The assistant scout's screens or server paths.** The assistant scout signs in with their own credentials and their queries run through RLS. The master key would let their requests bypass every policy, including the medical seal.
- **The video analyst's screens or server paths.** Same reasoning. The video analyst should see only players and games. The master key would expose scouting events and medical data they must never see.
- **Any everyday staff screen.** No coach, scout, medical staffer, or analyst should ever trigger a request that carries the master key. Staff screens use the anon key, and RLS decides what comes back.
- **Hiding a medical flag with the master key.** If a shared screen has a bug that would show a medical flag to the wrong role, the fix is to correct the query or the RLS policy, not to use the master key to selectively hide the flag. The master key makes the problem worse, not better.
- **Client-side code or browser bundles.** Any environment variable prefixed with VITE_ is bundled into the client and visible to anyone who opens DevTools. The service-role key must never use that prefix.
- **Committed files in the repository.** The real key must never appear in source code, test files, configuration files, or documentation. Use a placeholder in .env.example and inject the real value through environment variables or CI secrets.

---

## Medical and sports-science data stays sealed

The overgrant audit (docs/access/overgrant-audit.md) confirmed that medical notes and sports-science data are currently sealed from all non-medical roles by RLS policies. The service-role key is the one path that could break that seal. By restricting the key to the three allowed jobs listed above and forbidding it everywhere else, a buggy staff screen fails closed: if RLS denies a row, no staff request can override that denial because no staff request carries the master key. The screen shows nothing instead of leaking medical data.

---

## Storage rule

The real service-role key lives in server environment variables only. The repository contains a .env.example file with a placeholder:

```
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

The real value is never committed. It is set in the hosting platform (Vercel environment variables) and in CI secrets (GitHub Actions). Developers who need the key for local admin tasks retrieve it from the Supabase dashboard, not from the repository.

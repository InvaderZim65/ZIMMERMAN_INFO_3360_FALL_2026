# Sprint 2 Topic 1 Handoff -- Server Functions, Secret Hygiene, and Vitest

## Summary

This topic moved the Hockey Operations Directory from client-side seed data to
a server-backed architecture. Directory reads now flow through a TanStack Start
server function that uses a server-only Supabase client. Environment variables
are split into public (VITE_ prefix) and secret (no prefix) categories. Pure
mapping logic was extracted into a testable module, and a first Vitest suite
(17 tests) validates those mappers.

## Boundary decisions

| Concern | Placement | Rationale |
|---------|-----------|-----------|
| Directory UI (tables, filters, empty states) | Browser client | Must render where the user is |
| Supabase service role key | Server only | Leaked key = full data breach |
| Supabase client construction | Server only (`src/lib/supabase.server.ts`) | Constructor takes the secret key |
| Directory read queries | Server only (`src/server/directory.ts`) | Queries carry the credential |
| Pure mappers (name normalization, role filter) | Shared (`src/lib/directory/mappers.ts`) | No secrets, safe for tests and UI |
| Public Supabase URL and anon key | May reach client via `VITE_` prefix | Intentionally public values |

## Secret hygiene proof checklist

- [x] `.env.example` committed with placeholder values only (no real keys)
- [x] `.gitignore` includes `.env`, `.env.local`, `.env*.local`
- [x] `src/config/env.ts` separates `publicEnv` (VITE_ prefix) from `serverEnv` (no prefix)
- [x] `SUPABASE_SERVICE_ROLE_KEY` has no `VITE_` prefix in `.env.example`
- [x] `src/lib/supabase.server.ts` reads only from `serverEnv`
- [x] No route or component file imports `supabase.server.ts`
- [x] `src/routes/players/index.tsx` calls `getDirectoryEntries` -- never reads secrets directly
- [x] Error messages in `src/server/directory.ts` never expose raw Supabase errors or key values

## Test status

- **Framework:** Vitest 4.x, node environment
- **Test file:** `src/lib/directory/mappers.test.ts`
- **Result:** 17 tests, all passing
- **Coverage:** normalizeDisplayName, mapRowToDirectoryEntry, filterByRole, filterActiveEntries, toDirectoryCards
- **Red/green proven:** Tests fail on intentionally wrong expectations, pass on correct ones

## Leftover risks and known gaps

- No real Supabase project connected yet (seed data still used at runtime until env is filled)
- No per-user auth -- service role key grants full access, future sprint must add RLS
- No Playwright E2E tests yet (out of scope for this topic)
- Error UI is minimal (basic text messages, no retry mechanism)

## Next-topic recommendation

- Connect a real Supabase project and populate `directory_entries` table
- Add auth-aware loads with row-level security
- Expand the server function contract for write operations
- Add Playwright E2E tests for the directory route

## File map

| File | Purpose | Step |
|------|---------|------|
| `docs/boundary-risk-notes.md` | Risk map and success criteria | 1 |
| `docs/client-vs-server-inventory.md` | Client vs server labels with diagram | 2 |
| `.env.example` | Env var template (public vs secret) | 4 |
| `src/config/env.ts` | Typed env access with public/server split | 4 |
| `src/lib/supabase.server.ts` | Server-only Supabase client | 5 |
| `docs/server-function-contract.md` | Function contract before implementation | 6 |
| `src/server/directory.ts` | Server function for directory reads | 7 |
| `src/routes/players/index.tsx` | UI wired to server function | 8 |
| `src/lib/directory/mappers.ts` | Pure mapping helpers | 9 |
| `vitest.config.ts` | Vitest configuration | 10 |
| `src/lib/directory/mappers.test.ts` | Unit test suite for mappers | 11 |
| `docs/sprint-2-topic-1-handoff.md` | This handoff document | 12 |

## Stakeholder one-liner

Directory data now loads through a server function so Supabase credentials
never reach the browser, and 17 unit tests protect the mapping logic.

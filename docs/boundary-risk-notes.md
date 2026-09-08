# Boundary Risk Notes -- Hockey Operations Directory (Sprint 2, Topic 1)

## Client story (one paragraph)

The directory must load real player and staff data from Supabase. Privileged
reads need credentials that must never ship to the browser. We will move data
loading behind TanStack Start server functions, separate public vs secret env
vars, and extract pure mappers we can unit-test with Vitest.

## What might naively run in the client (risks)

- Creating a Supabase client in a React component or route file with a
  **service role key** (or any secret) imported from env that Vite exposes to
  the browser.
- Calling Supabase directly from `useEffect` / event handlers with secret keys
  embedded in the front-end bundle.
- Logging full env objects or error payloads that include secrets to the
  browser console.
- Storing service keys in `.env` variables prefixed for client exposure
  (e.g. `VITE_...`) "just to make it work locally."
- Shipping a single shared "Supabase client" module that both server and
  client import, accidentally pulling server-only secrets into the client graph.

## What must move server-side

- Any use of the Supabase **service role** (or other non-public) credential.
- Directory **read** orchestration that needs those credentials (fetch rows,
  shape errors, authorize internal ops access as designed later).
- Construction of a **server-only** Supabase client module that reads secret
  env vars and is never imported from browser-only UI modules.
- Environment loading that distinguishes **public** vars (safe to expose,
  e.g. anon/public URL patterns the product intentionally allows) from
  **secret** vars (server-only).

## What may stay in the client

- Presentational directory UI (tables, filters UI chrome, loading/empty states).
- Calling a **server function** endpoint/RPC-style entry and rendering the
  returned DTO (data transfer shape) -- without ever seeing raw secrets.
- Public configuration that is intentionally non-secret (if any), clearly named.

## Success criteria for this tutorial (checklist)

- [ ] A documented public-vs-secret env split exists (`.env.example` + typed
  config) and secret names are not client-prefixed.
- [ ] A server-only Supabase client module exists and is not imported by
  browser-only route/component modules for secret use.
- [ ] A TanStack Start **server function** loads directory data; the UI calls
  that function rather than embedding service credentials.
- [ ] Pure directory **mappers**/filters live in a testable module separate
  from I/O.
- [ ] Vitest is configured; at least one mapper unit test fails on wrong
  behavior and passes on correct behavior.
- [ ] A short handoff note records boundary decisions for the next topic.

## Out of scope for this topic (do not solve here)

- Full auth UX redesign, Playwright E2E, or production hardening beyond
  establishing the server boundary and first unit tests.
- Writing exploits or demonstrating real key theft -- only defensive separation.

## Open questions to resolve in later steps

- Exact server-function input/output contract for directory reads.
- Which env var names the team standardizes on for public vs secret keys.

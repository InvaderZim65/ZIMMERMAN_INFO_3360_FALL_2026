# Server Function Contract -- Directory Reads

**Related:** docs/boundary-risk-notes.md, docs/client-vs-server-inventory.md

## Purpose

Provide a single server function that the directory UI calls to load player
and staff rows from Supabase. The function runs server-side so the service
role key never reaches the browser.

## Function identity

| Property | Value |
|----------|-------|
| Name | `getDirectoryEntries` |
| File | `src/server/directory.ts` |
| Method | `GET` (read-only) |
| Framework | `createServerFn` from `@tanstack/react-start` |

## Inputs

| Parameter | Type | Required | Default | Notes |
|-----------|------|----------|---------|-------|
| search | `string` | No | `''` | Free-text filter on display name |
| role | `string` | No | `'all'` | Position filter: `'F'`, `'D'`, `'G'`, or `'all'` |
| limit | `number` | No | `100` | Max rows returned |

## Success output

```ts
type DirectoryEntry = {
  id: string
  displayName: string
  role: string
  teamName: string
  number: number
  isActive: boolean
}

type GetDirectoryEntriesResult = {
  ok: true
  entries: DirectoryEntry[]
}
```

## Error shapes

```ts
type GetDirectoryEntriesError = {
  ok: false
  code: 'VALIDATION' | 'UNAUTHORIZED' | 'UPSTREAM' | 'UNKNOWN'
  message: string
}
```

| Situation | Code | Example message |
|-----------|------|-----------------|
| Invalid filter value | `VALIDATION` | "Role must be F, D, G, or all" |
| Missing/invalid credentials at runtime | `UNAUTHORIZED` | "Server configuration error" |
| Supabase query fails | `UPSTREAM` | "Unable to load directory data" |
| Unexpected throw | `UNKNOWN` | "An unexpected error occurred" |

**Security rule:** Error messages never include raw Supabase errors, stack
traces, or credential values. Keep messages user-safe.

## Pure logic vs I/O split

| Layer | Responsibility | File |
|-------|---------------|------|
| **I/O (server)** | Call Supabase with service key, handle network errors | `src/server/directory.ts` |
| **Pure mappers** | Transform raw DB rows into `DirectoryEntry` shape, normalize names, filter inactive | `src/lib/directory/mappers.ts` |
| **UI (client)** | Call server function, render entries, show loading/error/empty states | `src/routes/players/index.tsx` |

## Boundary rules

- `src/server/directory.ts` imports `src/lib/supabase.server.ts` -- never imported by routes.
- Routes call the exported server function via TanStack Start RPC -- they never see the service key.
- Pure mappers import no server modules and are safe to import from test files.

## Non-goals for this step

- Authentication / per-user authorization (future sprint).
- Pagination beyond the limit parameter.
- Write operations (create, update, delete directory entries).

## Acceptance checks

- [ ] Server function exists at `src/server/directory.ts` with named export `getDirectoryEntries`.
- [ ] Function uses only `getSupabaseServerClient()` for DB access.
- [ ] Return type matches `GetDirectoryEntriesResult | GetDirectoryEntriesError`.
- [ ] No secret values appear in any error message sent to the client.
- [ ] Pure mapping logic lives in a separate file importable by Vitest.

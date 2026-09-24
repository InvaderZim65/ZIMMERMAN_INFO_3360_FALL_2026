# Scouting data-access public API

## Purpose

UI routes and TanStack Query hooks may talk to Supabase **only** through the
modules below. This keeps joins, filters, writes, and the aggregate RPC
schema-safe for Northline Hockey scouts.

## Allowed imports (public)

| Module | Functions UI may import | Scout use |
|--------|-------------------------|-----------|
| `src/lib/scouting/queries.ts` | `listPlayers`, `getPlayerById`, `listGames`, `getGameById`, `listEvents`, `listEventsWithPlayer` | Board lists and filters |
| `src/lib/scouting/mutations.ts` | `createScoutingEvent`, `updatePlayer` | Scout edits |
| `src/lib/scouting/rpc.ts` | `getPlayerEventCountsForGame` | Set-based totals on the board |

## Private (do not import from routes or hooks)

- `src/lib/supabase/client.ts` -- only imported inside `lib/scouting/*`
- Raw `supabase.from('...')` in route files
- Raw `supabase.rpc('some_string', ...)` outside `src/lib/scouting/rpc.ts`
- Hand-written SQL strings in the app

## Type contract

- All helpers must use types from `src/types/database.ts`.
- After any new migration or RPC, regenerate types **before** adding UI callers.
- Callers must not cast RPC results to `any`.

## Stability rule

If a new scout screen needs data not exposed here, **add a typed helper
in `lib/scouting/`** and update this doc. Do not bypass the layer.

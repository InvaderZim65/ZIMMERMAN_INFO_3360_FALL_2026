# Decisions Log - Hockey Ops Player Directory

Sprint 1 decisions recorded as they were made. Each entry explains what was chosen and why.

| # | Decision | Choice | Why |
|---|----------|--------|-----|
| 1 | Route structure | File-based routing under `src/routes/` | Matches TanStack Router conventions - the framework auto-generates the route tree from the folder layout, so adding a new page is just adding a file |
| 2 | Dynamic player detail | `/players/$playerId` as a path param, not a query string | Each player gets a bookmarkable URL (e.g. `/players/mcdavid-97`), which was a requirement from the client story |
| 3 | Path param validation | `parsePlayerIdParam` function in `src/lib/playerParams.ts` | Catches empty or non-string IDs before the page tries to render, preventing runtime crashes on bad URLs |
| 4 | Search param validation | `validatePlayersSearch` and `validateGamesSearch` in `src/lib/searchSchemas.ts` | Bad URL values (like `?position=banana`) fall back to safe defaults instead of crashing the page or showing broken state |
| 5 | Server-side data loading | `createServerFn` loaders wired into each route | Content appears in the first HTML response so staff on slow arena wifi see data immediately, no client-only spinner |
| 6 | Seed data module | `src/data/hockeySeed.ts` with 16 players and 11 games | Pages render real-looking content before Supabase is wired up - seed data lets us build and test the full UI without waiting on database setup |
| 7 | Shared nav component | `src/components/AppNav.tsx` with type-safe `Link` components | Consistent navigation on every page with active-state highlighting; type-safe Links mean the compiler catches broken paths before runtime |
| 8 | Not-found handling | `src/components/NotFoundPlayer.tsx` | Unknown player IDs show a clear "Player not found" message with a link back to the directory, instead of crashing or showing a blank page |

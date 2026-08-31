# Hockey Ops Player Directory - Requirements Brief (Sprint 1)

## Overview

Hockey operations needs a **player directory** staff can open on arena wifi and use immediately. Real directory content should appear on **first paint** (the first HTML the browser shows), not only after a long client-side spinner. Every player must have a **linkable, bookmarkable** page URL.

This sprint delivers a TanStack Start skeleton: routes, validated params, and server-rendered page shells with seed directory content. Full database auth and live feeds are later sprints.

Data for Sprint 1 comes from a **seed/demo data** module (static JSON or in-memory array) loaded on the server. It should look realistic (real-sounding names, numbers, positions, game dates) but does not need to match any real league. Minimum: 15 players and 10 games. Player names are stored as `firstName` and `lastName`. The directory represents one team; each game's opponent is the other side.

## Actors and goals

| Actor | Goal | Success looks like |
|-------|------|--------------------|
| Hockey ops staff | Open the directory on weak arena wifi and see players/games right away | First response HTML already lists directory content, no spinner |
| Hockey ops staff | Share or bookmark one player's page | URL like `/players/42` opens that player's detail page directly |
| Coach / scout (same app) | Browse games list and jump back to players | `/games` loads with content, nav links are consistent across pages |
| Future developer (you) | Implement without re-guessing scope | This brief + acceptance list stay the single checklist |

## Route map (minimum for this sprint)

| Route name | URL pattern | Kind | Purpose |
|------------|-------------|------|---------|
| Home | `/` | Static | Landing page + short directory summary |
| Players index | `/players` | Static | List all players; optional search/filter params |
| Player detail | `/players/$playerId` | Dynamic (path param) | One player's full info; bookmarkable |
| Games index | `/games` | Static | List games; optional status filter param |

Notes for implementers:

- `$playerId` is a **path param** (value is part of the URL path).
- Filters belong in **search params** (the `?key=value` part after the path), validated so bad values do not crash the page.
  - `/players` supports `?position=` (allowed: `center`, `left-wing`, `right-wing`, `defenseman`, `goalie`) and `?sort=` (allowed: `name`, `number`). Missing or invalid values fall back to showing all players sorted by last name.
  - `/games` supports `?status=` (allowed: `completed`, `upcoming`). Missing or invalid values show all games.
- Nav must reach Home, Players, and Games from every page.

## Data shown on first paint (server-rendered)

For Sprint 1, content comes from a **seed/demo data** module loaded on the server, not necessarily a live database yet, as long as staff see real-looking directory rows in the first HTML response.

| Page | Must appear in first HTML (not only after a spinner) |
|------|------------------------------------------------------|
| Home | App title + short intro + links into Players and Games |
| Players index | At least a full list of player names, numbers, and positions (seed data OK); each entry links to that player's detail page |
| Player detail | Player's first name, last name, number, position, height, weight, and shooting hand; clear "Player not found" message if the ID is invalid |
| Games index | At least a full list of games with date, opponent, and score or "Upcoming" label (seed data OK) |

## Type-safe links and params

- Internal links use the router's type-safe link helper (no hand-typed URL strings that can silently break).
- `playerId` is validated: non-empty string that matches a known player ID. If no match, the page renders a not-found state instead of crashing.
- Search params for filters have defined allowed values and sensible defaults. Invalid values are ignored and fall back to defaults. The page never crashes on a bad search param.

## Out of scope (this sprint)

- Real Supabase Auth / login / roles
- Live NHL feeds or external APIs
- Editing or creating players/games in the UI
- Payments, messaging, or mobile native apps
- Full-text search or fuzzy matching
- Pagination (data set is small enough to show on one page)
- Perfect visual design system (basic Tailwind layout is enough)
- Deployment to production hosting
- Test infrastructure (unit, integration, E2E)

## Acceptance criteria (browser-checkable)

1. Visiting `/` shows the home shell with visible directory content or navigation, not a blank page.
2. Visiting `/players` shows a players list with seed content in the initial HTML document (view page source to confirm).
3. Visiting `/players/<id>` for a known seed ID shows that player's detail shell; URL can be copied, pasted into a new tab, and reopened to the same player.
4. Visiting `/games` shows a games list with seed content in the initial HTML document.
5. Primary nav can reach Home, Players, and Games from every page without broken links.
6. Invalid player ID (e.g. `/players/not-a-real-id`) shows a safe not-found state rather than a raw crash page.
7. This requirements file explicitly names **server-rendered first paint** and **bookmarkable player URLs** as non-negotiable goals for all agent prompts that follow.

## Sprint boundary

Done for Sprint 1 means: scaffolded TanStack Start app, route tree matching this map, validated path and search params, SSR shells with seed directory content, and this brief as the stakeholder checklist. Not done: production data pipeline, auth, or polished visual design.

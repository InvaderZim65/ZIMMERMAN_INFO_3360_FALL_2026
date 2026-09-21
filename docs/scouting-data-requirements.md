# Scouting data requirements -- Northline Hockey

## 1. Actors and goals

| Actor | Goal | What they need from data |
|-------|------|---------------------------|
| Scout | Review and update player evaluations tied to games | Lists of players; events linked to a player and a game; ability to add/edit event notes without breaking other rows |
| Ops / data steward | Keep reference data consistent when the schema changes | Clear entities and keys so renames or new columns do not silently break joins |

Out of scope for this sprint: public fan apps, payment, live video, fantasy features, authentication product details, or ticket sales.

## 2. Core entities and relationships (plain language)

- **Player** -- a skater or goalie Northline tracks. Identified uniquely; has display name and basic roster fields scouts filter on (e.g. position, team/org label).
- **Game** -- a contest on a date between two sides. Scouts attach events to a specific game.
- **Event** -- something observed in a game about a player (e.g. goal, assist, hit, penalty, note). Belongs to exactly one player and exactly one game.

Relationships scouts rely on:

- One player has many events.
- One game has many events.
- Listing "events for player X in game Y" must use those links -- not free-text name matching only.

## 3. Filters and scout views

Scouts need to:

1. List players (optionally filter by position or team/org label).
2. List games (optionally by date range).
3. List events filtered by player, by game, or both.
4. See a **set-based aggregate** per player (e.g. event counts or goals totals across games) -- not only row-by-row lists.

Writes scouts/ops need:

- Create and update players and events through the app's data layer (typed paths -- not ad-hoc SQL strings in the UI).

## 4. Success criteria (measurable)

1. **Join integrity** -- Every event row returned for a scout view includes resolvable player and game identity (no orphan events in happy-path seed data).
2. **Filter fidelity** -- Player, game, and combined event filters return only matching rows; empty filters mean "all" for that dimension.
3. **Schema-change safety** -- Reads and writes go through generated types / typed helpers so renaming or mistyping a column is caught at build or typecheck time, not only in production.
4. **Aggregate usefulness** -- A single server-side aggregate (RPC or equivalent) returns per-player totals scouts care about without the client summing large event lists by hand.
5. **Cache freshness (later steps)** -- After a successful create/update, list and aggregate views scouts rely on can be invalidated so the UI does not show stale rows (documented when TanStack Query is layered on).

## 5. Glossary for later steps

| Term | Meaning in this project |
|------|-------------------------|
| Entity | A real-world thing we will store as a table (player, game, event) |
| Join | Combining rows from related tables using their links |
| Filter | Narrowing a list by field values scouts choose |
| Aggregate | A summed or counted result across many rows (e.g. goals by player) |
| Typed data access | Query/write helpers that use TypeScript types from the database schema |

## 6. Source of truth

This file is the requirements source of truth for Sprint 3. Schema notes, query modules, RPC design, and acceptance checks must trace back to sections 1-4. If a later change expands scope, update this brief first.

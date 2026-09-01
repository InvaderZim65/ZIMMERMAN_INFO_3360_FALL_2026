# Search Params Design Notes

## Overview

Search params let hockey ops staff filter the players list and games schedule through the URL query string. TanStack Router validates these params on every navigation, falling back to safe defaults when values are missing or invalid.

## Players search params

| Param | Type | Valid values | Default | Purpose |
|-------|------|-------------|---------|---------|
| `position` | `PlayerPosition` | `F`, `D`, `G`, `all` | `all` | Filter by forward, defense, goalie, or show all |
| `status` | `RosterStatus` | `active`, `ir`, `all` | `active` | Filter by roster status |

Example URL: `/players?position=D&status=active`

### Validation rules

- `position` must be one of the four allowed strings. Anything else (typos, injection attempts, missing param) falls back to `all`.
- `status` must be one of the three allowed strings. Unknown values fall back to `active` since staff almost always want the active roster.

## Games search params

| Param | Type | Valid values | Default | Purpose |
|-------|------|-------------|---------|---------|
| `team` | `string` | Any team abbreviation (trimmed, uppercased) | `''` (empty, shows all) | Filter games by opponent |
| `date` | `string` | `YYYY-MM-DD` format | `''` (empty, shows all) | Filter games by date |

Example URL: `/games?team=EDM&date=2026-11-15`

### Validation rules

- `team` is trimmed and uppercased. No strict enum check since opponent abbreviations come from external data sources and the list may grow.
- `date` must match the `YYYY-MM-DD` regex pattern. Invalid formats (partial dates, plain text) fall back to empty string, which shows all games.

## Why defaults matter

When a staff member bookmarks `/players` with no query string, the app needs to show something useful without erroring. The default behavior is:

- Players: show all positions, active roster only
- Games: show all teams, all dates

This means a bare URL always works. Staff can then narrow down with filters, and the updated query string is shareable.

## Where validation lives

All validation logic is in `src/lib/searchSchemas.ts`. Route files import `validatePlayersSearch` and `validateGamesSearch` and pass them to `validateSearch` in the route definition. This keeps the route files focused on rendering while the schema file owns the rules.

## Type safety

The `PlayersSearch` and `GamesSearch` types flow from the schema file into route components via `Route.useSearch()`. TypeScript enforces that components only access validated fields, and any new filter param must be added to both the type and the validator.

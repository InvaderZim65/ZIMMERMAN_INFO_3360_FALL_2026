# Scouting schema notes

## Tables

- **players** -- One row per skater or goalie Northline tracks. Stores roster fields scouts filter on (position, team_name) and display fields (full_name, jersey_number). Primary key is a UUID so IDs are unique across systems and hard to guess.

- **games** -- One row per contest. Stores opponent, date (played_on), venue, and home/away flag. Scouts attach events to a specific game. Primary key is UUID.

- **scouting_events** -- One row per observation a scout records about a player in a game. Stores event_type (goal, assist, hit, penalty, note), optional period/clock_seconds for timing, and free-text notes. Foreign keys to players and games enforce that every event belongs to exactly one player and exactly one game.

## Relationships

- `scouting_events.player_id` -> `players.id` (many events per player)
- `scouting_events.game_id` -> `games.id` (many events per game)
- A scout can filter events by player, by game, or by both (combined filter) using these foreign keys.

## Filters supported

From the requirements brief:

1. **Player list** -- filter by position or team_name columns on players table.
2. **Game list** -- filter by played_on (date range) using the games_played_on_idx index.
3. **Events by player** -- use scouting_events_player_id_idx.
4. **Events by game** -- use scouting_events_game_id_idx.
5. **Events by player + game** -- combine both foreign key filters.
6. **Per-player aggregate** -- COUNT/SUM over scouting_events grouped by player_id (RPC built in a later step).

## Decisions

- **ON DELETE RESTRICT** on both foreign keys: a player or game cannot be deleted while scouting events reference it. This prevents orphan rows and matches scout reality (you don't silently lose observation data).
- **Nullability**: position, jersey_number, team_name, venue, period, clock_seconds, and notes are nullable because scouts may not always have that information at entry time. Core identifiers (full_name, opponent, played_on, event_type) are NOT NULL.
- **snake_case** naming throughout for Postgres convention and cleaner TypeScript type generation.
- **No RLS policies yet** -- access control is a Sprint 4 concern per the syllabus.
- **No seed data in the migration** -- seed data will be handled separately to keep the migration clean and repeatable.

## Open questions for next steps

- Should event_type be constrained to an enum or CHECK list, or left as free text for flexibility? Currently free text with a non-blank check.
- Will scouts need to sort events by period/clock_seconds? If so, a composite index may help later.

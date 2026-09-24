# Scouting cache invalidation map

Each mutation hook, the write it calls, the query keys it invalidates, and why.

| Hook | Write function | Keys invalidated | Scout reason |
|------|---------------|-----------------|--------------|
| `useCreatePlayer` | `createPlayer` | `scoutingKeys.players()` | New player must appear in all player list views |
| `useUpdatePlayer` | `updatePlayer` | `scoutingKeys.players()`, `scoutingKeys.playerDetail(playerId)` | Changed player info refreshes lists and that player's detail |
| `useCreateGame` | `createGame` | `scoutingKeys.games()` | New game must appear in game list views |
| `useUpdateGame` | `updateGame` | `scoutingKeys.games()` | Changed game info refreshes game lists |
| `useCreateScoutingEvent` | `createScoutingEvent` | `scoutingKeys.events()`, `scoutingKeys.playerDetail(player_id)`, `scoutingKeys.playerEventCounts(game_id)`, `scoutingKeys.aggregates()` | New event updates event lists, the related player detail, and per-player aggregate counts for that game |
| `useUpdateEvent` | `updateEvent` | `scoutingKeys.events()`, `scoutingKeys.playerDetail(player_id)`, `scoutingKeys.playerEventCounts(game_id)`, `scoutingKeys.aggregates()` | Edited event refreshes event lists and aggregate counts that may have changed |

## Rules

- Never call `queryClient.invalidateQueries()` with no filter (wipes entire cache).
- Always use `scoutingKeys.*` factories from `query-keys.ts` for key references.
- Event mutations always invalidate aggregates because counts change.
- Player mutations do not invalidate events or aggregates (player edits do not change event counts).

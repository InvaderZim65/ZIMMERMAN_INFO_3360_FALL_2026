# Scouting cache invalidation map

Each mutation hook, the write it calls, the query keys it invalidates, and why.

| Hook | Write function | Keys invalidated | Scout reason |
|------|---------------|-----------------|--------------|
| `useCreateScoutingEvent` | `createScoutingEvent` | `scoutingKeys.events()`, `scoutingKeys.playerDetail(player_id)`, `scoutingKeys.playerEventCounts(game_id)`, `scoutingKeys.aggregates()` | New event must appear in event lists, update the player's detail view, and refresh per-player aggregate counts for that game |
| `useUpdatePlayer` | `updatePlayer` | `scoutingKeys.players()`, `scoutingKeys.playerDetail(playerId)` | Changed player info must reflect in all player lists and the specific player's detail view |

## Rules

- Never call `queryClient.invalidateQueries()` with no filter (wipes entire cache).
- Always use `scoutingKeys.*` factories from `query-keys.ts` for key references.
- Event mutations always invalidate aggregates because counts change.
- Player mutations do not invalidate events or aggregates (player edits do not change event counts).

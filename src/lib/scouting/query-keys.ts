// Hierarchical factory -- stable addresses for cache + later invalidation
export const scoutingKeys = {
  all: ['scouting'] as const,

  players: () => [...scoutingKeys.all, 'players'] as const,
  playerLists: () => [...scoutingKeys.players(), 'list'] as const,
  playerList: (filters: { position?: string; teamName?: string } = {}) =>
    [...scoutingKeys.playerLists(), filters] as const,
  playerDetail: (playerId: string) =>
    [...scoutingKeys.players(), 'detail', playerId] as const,

  games: () => [...scoutingKeys.all, 'games'] as const,
  gameLists: () => [...scoutingKeys.games(), 'list'] as const,
  gameList: (filters: { dateFrom?: string; dateTo?: string } = {}) =>
    [...scoutingKeys.gameLists(), filters] as const,

  events: () => [...scoutingKeys.all, 'events'] as const,
  eventLists: () => [...scoutingKeys.events(), 'list'] as const,
  eventList: (filters: { playerId?: string; gameId?: string; eventType?: string } = {}) =>
    [...scoutingKeys.eventLists(), filters] as const,

  aggregates: () => [...scoutingKeys.all, 'aggregates'] as const,
  playerEventCounts: (gameId: string) =>
    [...scoutingKeys.aggregates(), 'player-event-counts', gameId] as const,
}

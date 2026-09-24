import { useQuery } from '@tanstack/react-query'
import { scoutingKeys } from './query-keys'
import {
  listPlayers,
  getPlayerById,
  listGames,
  getGameById,
  listEvents,
  listEventsWithPlayer,
  type PlayerListFilters,
  type GameListFilters,
  type EventListFilters,
} from './queries'
import { getPlayerEventCountsForGame } from './rpc'

export function usePlayers(filters: PlayerListFilters = {}) {
  return useQuery({
    queryKey: scoutingKeys.playerList(filters),
    queryFn: () => listPlayers(filters),
  })
}

export function usePlayer(playerId: string | undefined) {
  return useQuery({
    queryKey: scoutingKeys.playerDetail(playerId ?? ''),
    queryFn: () => getPlayerById(playerId as string),
    enabled: Boolean(playerId),
  })
}

export function useGames(filters: GameListFilters = {}) {
  return useQuery({
    queryKey: scoutingKeys.gameList(filters),
    queryFn: () => listGames(filters),
  })
}

export function useGame(gameId: string | undefined) {
  return useQuery({
    queryKey: scoutingKeys.gameList({ dateFrom: gameId }),
    queryFn: () => getGameById(gameId as string),
    enabled: Boolean(gameId),
  })
}

export function useEvents(filters: EventListFilters = {}) {
  return useQuery({
    queryKey: scoutingKeys.eventList(filters),
    queryFn: () => listEvents(filters),
  })
}

export function useEventsWithPlayer(filters: EventListFilters = {}) {
  return useQuery({
    queryKey: [...scoutingKeys.eventList(filters), 'withPlayer'] as const,
    queryFn: () => listEventsWithPlayer(filters),
  })
}

export function usePlayerEventCounts(gameId: string | undefined) {
  return useQuery({
    queryKey: scoutingKeys.playerEventCounts(gameId ?? ''),
    queryFn: () => getPlayerEventCountsForGame(gameId as string),
    enabled: Boolean(gameId),
  })
}

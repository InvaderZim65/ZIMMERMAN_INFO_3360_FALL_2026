import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createPlayer,
  updatePlayer,
  createGame,
  updateGame,
  createScoutingEvent,
  updateEvent,
} from './mutations'
import { scoutingKeys } from './query-keys'
import type { Database } from '../../types/database'

type PlayerInsert = Database['public']['Tables']['players']['Insert']
type PlayerUpdate = Database['public']['Tables']['players']['Update']
type GameInsert = Database['public']['Tables']['games']['Insert']
type GameUpdate = Database['public']['Tables']['games']['Update']
type EventInsert = Database['public']['Tables']['scouting_events']['Insert']
type EventUpdate = Database['public']['Tables']['scouting_events']['Update']

export function useCreatePlayer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: PlayerInsert) => createPlayer(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: scoutingKeys.players() })
    },
  })
}

export function useUpdatePlayer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ playerId, fields }: { playerId: string; fields: PlayerUpdate }) =>
      updatePlayer(playerId, fields),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: scoutingKeys.players() })
      void queryClient.invalidateQueries({
        queryKey: scoutingKeys.playerDetail(variables.playerId),
      })
    },
  })
}

export function useCreateGame() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: GameInsert) => createGame(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: scoutingKeys.games() })
    },
  })
}

export function useUpdateGame() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ gameId, fields }: { gameId: string; fields: GameUpdate }) =>
      updateGame(gameId, fields),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: scoutingKeys.games() })
    },
  })
}

export function useCreateScoutingEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: EventInsert) => createScoutingEvent(input),
    onSuccess: (_data, variables) => {
      // Event writes touch event lists + related player/game views + aggregates
      void queryClient.invalidateQueries({ queryKey: scoutingKeys.events() })
      if (variables.player_id) {
        void queryClient.invalidateQueries({
          queryKey: scoutingKeys.playerDetail(variables.player_id),
        })
      }
      if (variables.game_id) {
        void queryClient.invalidateQueries({
          queryKey: scoutingKeys.playerEventCounts(variables.game_id),
        })
      }
      void queryClient.invalidateQueries({ queryKey: scoutingKeys.aggregates() })
    },
  })
}

export function useUpdateEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ eventId, fields }: { eventId: string; fields: EventUpdate }) =>
      updateEvent(eventId, fields),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: scoutingKeys.events() })
      if (variables.fields.player_id) {
        void queryClient.invalidateQueries({
          queryKey: scoutingKeys.playerDetail(variables.fields.player_id),
        })
      }
      if (variables.fields.game_id) {
        void queryClient.invalidateQueries({
          queryKey: scoutingKeys.playerEventCounts(variables.fields.game_id),
        })
      }
      void queryClient.invalidateQueries({ queryKey: scoutingKeys.aggregates() })
    },
  })
}

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createScoutingEvent, updatePlayer } from './mutations'
import { scoutingKeys } from './query-keys'
import type { Database } from '../../types/database'

type EventInsert = Database['public']['Tables']['scouting_events']['Insert']
type PlayerUpdate = Database['public']['Tables']['players']['Update']

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

export function useUpdatePlayer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ playerId, fields }: { playerId: string; fields: PlayerUpdate }) =>
      updatePlayer(playerId, fields),
    onSuccess: (_data, variables) => {
      // Updated player -> refresh player lists and that player's detail
      void queryClient.invalidateQueries({ queryKey: scoutingKeys.players() })
      void queryClient.invalidateQueries({
        queryKey: scoutingKeys.playerDetail(variables.playerId),
      })
    },
  })
}

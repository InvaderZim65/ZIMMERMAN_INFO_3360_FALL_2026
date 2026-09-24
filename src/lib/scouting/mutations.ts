import { supabase } from '../supabase/client'
import type { Database } from '../../types/database'

type EventInsert = Database['public']['Tables']['scouting_events']['Insert']
type EventRow = Database['public']['Tables']['scouting_events']['Row']
type PlayerUpdate = Database['public']['Tables']['players']['Update']
type PlayerRow = Database['public']['Tables']['players']['Row']

export type MutationResult<T> =
  | { data: T; error: null }
  | { data: null; error: { message: string } }

/**
 * Log a scouting event (goal, hit, note-linked observation, etc.).
 * Required fields are enforced by EventInsert + a small runtime check.
 */
export async function createScoutingEvent(
  input: EventInsert
): Promise<MutationResult<EventRow>> {
  if (!input.player_id || !input.game_id || !input.event_type) {
    return {
      data: null,
      error: { message: 'player_id, game_id, and event_type are required to log an event.' },
    }
  }

  const { data, error } = await supabase
    .from('scouting_events')
    .insert(input)
    .select()
    .single()

  if (error) {
    return { data: null, error: { message: error.message } }
  }
  return { data, error: null }
}

/**
 * Partial update on a player row (e.g. position, team_name, jersey_number).
 * Targets a single player by id with .eq.
 */
export async function updatePlayer(
  playerId: string,
  fields: PlayerUpdate
): Promise<MutationResult<PlayerRow>> {
  if (!playerId) {
    return {
      data: null,
      error: { message: 'playerId is required to update a player.' },
    }
  }

  const { data, error } = await supabase
    .from('players')
    .update(fields)
    .eq('id', playerId)
    .select()
    .single()

  if (error) {
    return { data: null, error: { message: error.message } }
  }
  return { data, error: null }
}

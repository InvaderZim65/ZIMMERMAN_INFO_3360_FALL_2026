import { supabase } from '../supabase/client'
import type { Database } from '../../types/database'

type PlayerInsert = Database['public']['Tables']['players']['Insert']
type PlayerUpdate = Database['public']['Tables']['players']['Update']
type PlayerRow = Database['public']['Tables']['players']['Row']
type GameInsert = Database['public']['Tables']['games']['Insert']
type GameUpdate = Database['public']['Tables']['games']['Update']
type GameRow = Database['public']['Tables']['games']['Row']
type EventInsert = Database['public']['Tables']['scouting_events']['Insert']
type EventUpdate = Database['public']['Tables']['scouting_events']['Update']
type EventRow = Database['public']['Tables']['scouting_events']['Row']

export type MutationResult<T> =
  | { data: T; error: null }
  | { data: null; error: { message: string } }

/** Create a new player record. */
export async function createPlayer(
  input: PlayerInsert
): Promise<MutationResult<PlayerRow>> {
  if (!input.full_name) {
    return {
      data: null,
      error: { message: 'full_name is required to create a player.' },
    }
  }
  const { data, error } = await supabase
    .from('players')
    .insert(input)
    .select()
    .single()
  if (error) {
    return { data: null, error: { message: error.message } }
  }
  return { data, error: null }
}

/** Partial update on a player row by id. */
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

/** Create a new game record. */
export async function createGame(
  input: GameInsert
): Promise<MutationResult<GameRow>> {
  if (!input.opponent || !input.played_on) {
    return {
      data: null,
      error: { message: 'opponent and played_on are required to create a game.' },
    }
  }
  const { data, error } = await supabase
    .from('games')
    .insert(input)
    .select()
    .single()
  if (error) {
    return { data: null, error: { message: error.message } }
  }
  return { data, error: null }
}

/** Partial update on a game row by id. */
export async function updateGame(
  gameId: string,
  fields: GameUpdate
): Promise<MutationResult<GameRow>> {
  if (!gameId) {
    return {
      data: null,
      error: { message: 'gameId is required to update a game.' },
    }
  }
  const { data, error } = await supabase
    .from('games')
    .update(fields)
    .eq('id', gameId)
    .select()
    .single()
  if (error) {
    return { data: null, error: { message: error.message } }
  }
  return { data, error: null }
}

/** Log a scouting event (goal, hit, note-linked observation, etc.). */
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

/** Partial update on an event row by id. */
export async function updateEvent(
  eventId: string,
  fields: EventUpdate
): Promise<MutationResult<EventRow>> {
  if (!eventId) {
    return {
      data: null,
      error: { message: 'eventId is required to update an event.' },
    }
  }
  const { data, error } = await supabase
    .from('scouting_events')
    .update(fields)
    .eq('id', eventId)
    .select()
    .single()
  if (error) {
    return { data: null, error: { message: error.message } }
  }
  return { data, error: null }
}

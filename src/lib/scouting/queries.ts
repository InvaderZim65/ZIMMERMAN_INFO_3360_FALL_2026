import { supabase } from '../supabase/client'
import type { Database } from '../../types/database'

type PlayerRow = Database['public']['Tables']['players']['Row']
type GameRow = Database['public']['Tables']['games']['Row']
type EventRow = Database['public']['Tables']['scouting_events']['Row']

export type PlayerListFilters = {
  position?: string | null
  teamName?: string | null
}

export type GameListFilters = {
  dateFrom?: string | null
  dateTo?: string | null
}

export type EventListFilters = {
  gameId?: string | null
  playerId?: string | null
  eventType?: string | null
}

/** A scouting event joined with the player's identity fields scouts need on the board. */
export type EventWithPlayer = EventRow & {
  player: Pick<PlayerRow, 'id' | 'full_name' | 'position'> | null
}

// ── Player reads ──

export async function listPlayers(
  filters: PlayerListFilters = {},
): Promise<PlayerRow[]> {
  let query = supabase.from('players').select('*').order('full_name')
  if (filters.position) {
    query = query.eq('position', filters.position)
  }
  if (filters.teamName) {
    query = query.eq('team_name', filters.teamName)
  }
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getPlayerById(
  id: string,
): Promise<PlayerRow | null> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

// ── Game reads ──

export async function listGames(
  filters: GameListFilters = {},
): Promise<GameRow[]> {
  let query = supabase
    .from('games')
    .select('*')
    .order('played_on', { ascending: false })
  if (filters.dateFrom) {
    query = query.gte('played_on', filters.dateFrom)
  }
  if (filters.dateTo) {
    query = query.lte('played_on', filters.dateTo)
  }
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function getGameById(
  id: string,
): Promise<GameRow | null> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

// ── Scouting event reads ──

export async function listEvents(
  filters: EventListFilters = {},
): Promise<EventRow[]> {
  let query = supabase
    .from('scouting_events')
    .select('*')
    .order('created_at', { ascending: false })
  if (filters.gameId) {
    query = query.eq('game_id', filters.gameId)
  }
  if (filters.playerId) {
    query = query.eq('player_id', filters.playerId)
  }
  if (filters.eventType) {
    query = query.eq('event_type', filters.eventType)
  }
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

/** Events joined with player identity for the scout board view. */
export async function listEventsWithPlayer(
  filters: EventListFilters = {},
): Promise<EventWithPlayer[]> {
  let query = supabase
    .from('scouting_events')
    .select('*, player:players(id, full_name, position)')
    .order('created_at', { ascending: false })
  if (filters.gameId) {
    query = query.eq('game_id', filters.gameId)
  }
  if (filters.playerId) {
    query = query.eq('player_id', filters.playerId)
  }
  if (filters.eventType) {
    query = query.eq('event_type', filters.eventType)
  }
  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as EventWithPlayer[]
}

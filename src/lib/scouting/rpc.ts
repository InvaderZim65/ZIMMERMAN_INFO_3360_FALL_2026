import { supabase } from '../supabase/client'

/** Row shape returned by player_event_counts_for_game until typegen includes the RPC. */
export type PlayerEventCountRow = {
  player_id: string
  player_name: string
  event_count: number
  goal_count: number
}

/**
 * Set-based aggregate: one round-trip to Postgres for per-player event totals in a game.
 * Do not replace this with N client queries that count in JavaScript.
 */
export async function getPlayerEventCountsForGame(
  gameId: string
): Promise<PlayerEventCountRow[]> {
  const { data, error } = await supabase.rpc('player_event_counts_for_game', {
    p_game_id: gameId,
  })

  if (error) {
    throw new Error(`player_event_counts_for_game failed: ${error.message}`)
  }

  return (data ?? []) as PlayerEventCountRow[]
}

import { PLAYERS, GAMES } from '../data/hockeySeed'
import type { SeedPlayer, SeedGame } from '../data/hockeySeed'

/**
 * List players with optional position filter.
 * Runs server-side so the seed data is never bundled into the client.
 */
export function listPlayers(position?: string): SeedPlayer[] {
  if (!position || position === 'all') {
    return PLAYERS
  }
  return PLAYERS.filter((p) => p.position === position)
}

/**
 * Look up a single player by id.
 * Returns undefined when no match is found (caller handles not-found state).
 */
export function getPlayerById(id: string): SeedPlayer | undefined {
  return PLAYERS.find((p) => p.id === id)
}

/**
 * List games with optional venue filter.
 * Accepts 'home', 'away', or anything else (returns all).
 */
export function listGames(venue?: string): SeedGame[] {
  if (venue === 'home' || venue === 'away') {
    return GAMES.filter((g) => g.venue === venue)
  }
  return GAMES
}

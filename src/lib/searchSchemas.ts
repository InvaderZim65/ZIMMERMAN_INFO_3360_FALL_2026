export type PlayerPosition = 'F' | 'D' | 'G' | 'all'
export type RosterStatus = 'active' | 'ir' | 'all'

export type PlayersSearch = {
  position: PlayerPosition
  status: RosterStatus
}

export type GamesSearch = {
  team: string
  date: string
}

const PLAYER_POSITIONS = new Set(['F', 'D', 'G', 'all'])
const ROSTER_STATUSES = new Set(['active', 'ir', 'all'])

export const defaultPlayersSearch = (): PlayersSearch => ({
  position: 'all',
  status: 'active',
})

export const defaultGamesSearch = (): GamesSearch => ({
  team: '',
  date: '',
})

export function validatePlayersSearch(raw: Record<string, unknown>): PlayersSearch {
  const defaults = defaultPlayersSearch()
  const position =
    typeof raw.position === 'string' && PLAYER_POSITIONS.has(raw.position)
      ? (raw.position as PlayerPosition)
      : defaults.position
  const status =
    typeof raw.status === 'string' && ROSTER_STATUSES.has(raw.status)
      ? (raw.status as RosterStatus)
      : defaults.status
  return { position, status }
}

export function validateGamesSearch(raw: Record<string, unknown>): GamesSearch {
  const defaults = defaultGamesSearch()
  const team = typeof raw.team === 'string' ? raw.team.trim().toUpperCase() : defaults.team
  const dateRaw = typeof raw.date === 'string' ? raw.date.trim() : ''
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : defaults.date
  return { team, date }
}

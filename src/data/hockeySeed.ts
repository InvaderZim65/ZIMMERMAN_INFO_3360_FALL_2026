export type SeedPlayer = {
  id: string
  name: string
  position: 'F' | 'D' | 'G'
  number: number
  team: string
}

export type SeedGame = {
  id: string
  opponent: string
  date: string
  venue: 'home' | 'away'
  status: 'scheduled' | 'final'
}

export const PLAYERS: SeedPlayer[] = [
  { id: 'mcdavid-97', name: 'Connor McDavid', position: 'F', number: 97, team: 'EDM' },
  { id: 'crosby-87', name: 'Sidney Crosby', position: 'F', number: 87, team: 'PIT' },
  { id: 'mackinnon-29', name: 'Nathan MacKinnon', position: 'F', number: 29, team: 'COL' },
  { id: 'draisaitl-29', name: 'Leon Draisaitl', position: 'F', number: 29, team: 'EDM' },
  { id: 'matthews-34', name: 'Auston Matthews', position: 'F', number: 34, team: 'TOR' },
  { id: 'makar-8', name: 'Cale Makar', position: 'D', number: 8, team: 'COL' },
  { id: 'fox-23', name: 'Adam Fox', position: 'D', number: 23, team: 'NYR' },
  { id: 'hedman-77', name: 'Victor Hedman', position: 'D', number: 77, team: 'TBL' },
  { id: 'mcavoy-73', name: 'Charlie McAvoy', position: 'D', number: 73, team: 'BOS' },
  { id: 'josi-59', name: 'Roman Josi', position: 'D', number: 59, team: 'NSH' },
  { id: 'vasilevskiy-88', name: 'Andrei Vasilevskiy', position: 'G', number: 88, team: 'TBL' },
  { id: 'shesterkin-31', name: 'Igor Shesterkin', position: 'G', number: 31, team: 'NYR' },
  { id: 'saros-74', name: 'Juuse Saros', position: 'G', number: 74, team: 'TOR' },
  { id: 'kucherov-86', name: 'Nikita Kucherov', position: 'F', number: 86, team: 'TBL' },
  { id: 'panarin-10', name: 'Artemi Panarin', position: 'F', number: 10, team: 'NYR' },
  { id: 'pastrnak-88', name: 'David Pastrnak', position: 'F', number: 88, team: 'BOS' },
]

export const GAMES: SeedGame[] = [
  { id: 'game-001', opponent: 'EDM', date: '2026-10-12', venue: 'home', status: 'scheduled' },
  { id: 'game-002', opponent: 'COL', date: '2026-10-15', venue: 'away', status: 'scheduled' },
  { id: 'game-003', opponent: 'TOR', date: '2026-10-19', venue: 'home', status: 'scheduled' },
  { id: 'game-004', opponent: 'NYR', date: '2026-10-22', venue: 'away', status: 'scheduled' },
  { id: 'game-005', opponent: 'TBL', date: '2026-10-26', venue: 'home', status: 'scheduled' },
  { id: 'game-006', opponent: 'PIT', date: '2026-10-29', venue: 'away', status: 'scheduled' },
  { id: 'game-007', opponent: 'BOS', date: '2026-11-02', venue: 'home', status: 'scheduled' },
  { id: 'game-008', opponent: 'NSH', date: '2026-11-05', venue: 'away', status: 'scheduled' },
  { id: 'game-009', opponent: 'EDM', date: '2026-11-09', venue: 'away', status: 'scheduled' },
  { id: 'game-010', opponent: 'COL', date: '2026-11-12', venue: 'home', status: 'scheduled' },
  { id: 'game-011', opponent: 'TOR', date: '2026-11-15', venue: 'away', status: 'scheduled' },
]

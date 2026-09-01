import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { validateGamesSearch } from '../../lib/searchSchemas'
import { listGames } from '../../server/directoryLoader'
import type { SeedGame } from '../../data/hockeySeed'

const loadGames = createServerFn({ method: 'GET' }).handler(async () => {
  return listGames()
})

export const Route = createFileRoute('/games/')({
  validateSearch: (raw) => validateGamesSearch(raw as Record<string, unknown>),
  loader: () => loadGames(),
  component: GamesIndexPage,
})

function GamesIndexPage() {
  const allGames = Route.useLoaderData() as SeedGame[]
  const { team, date } = Route.useSearch()

  // Client-side filtering based on validated search params
  const games = allGames.filter((g) => {
    if (team && g.opponent !== team) return false
    if (date && g.date !== date) return false
    return true
  })

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold text-slate-900">Games</h1>
      <p className="mt-1 text-sm text-slate-500">
        Schedule view for upcoming and recent matchups.
      </p>

      {/* Active filters display */}
      {(team || date) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-500">Filtered by:</span>
          {team && (
            <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-sky-800">
              Team: {team}
            </span>
          )}
          {date && (
            <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-sky-800">
              Date: {date}
            </span>
          )}
          <Link
            to="/games"
            search={{ team: '', date: '' }}
            className="text-sky-700 underline underline-offset-2"
          >
            Clear filters
          </Link>
        </div>
      )}

      {/* Cross-link to players */}
      <p className="mt-4 text-sm text-slate-500">
        Need roster info?{' '}
        <Link to="/players" search={{ position: 'all', status: 'active' }} className="text-sky-700 underline underline-offset-2">
          View players
        </Link>
      </p>

      {/* Games list */}
      {games.length === 0 ? (
        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
          <p className="font-medium text-slate-700">No games match the current filters</p>
          <p className="mt-1 text-sm text-slate-500">
            Try clearing the team or date filter.
          </p>
          <Link
            to="/games"
            search={{ team: '', date: '' }}
            className="mt-3 inline-block text-sm text-sky-700 underline underline-offset-2"
          >
            Show all games
          </Link>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Opponent</th>
                <th className="px-4 py-2">Venue</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {games.map((game) => (
                <tr key={game.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono text-slate-700">{game.date}</td>
                  <td className="px-4 py-2">
                    <Link
                      to="/games"
                      search={(prev) => ({ team: game.opponent, date: prev.date ?? '' })}
                      className="font-medium text-slate-900 hover:text-sky-700"
                    >
                      {game.opponent}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-600 capitalize">{game.venue}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        game.status === 'final'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {game.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-slate-400">
        {games.length} game{games.length !== 1 ? 's' : ''} shown
      </p>
    </main>
  )
}

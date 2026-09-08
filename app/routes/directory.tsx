import { createFileRoute, Link } from '@tanstack/react-router'
import { validatePlayersSearch } from '../../lib/searchSchemas'
import { getDirectoryEntries } from '../../server/directory'
import type { DirectoryEntry } from '../../server/directory'

export const Route = createFileRoute('/players/')({
  validateSearch: (raw) => validatePlayersSearch(raw as Record<string, unknown>),
  loaderDeps: ({ search }) => ({ position: search.position }),
  loader: async ({ deps }) => {
    const entries = await getDirectoryEntries({
      data: { role: deps.position },
    })
    return entries
  },
  component: PlayersIndexPage,
})

function PlayersIndexPage() {
  const entries = Route.useLoaderData() as DirectoryEntry[]
  const { position, status } = Route.useSearch()

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold text-slate-900">Players</h1>
      <p className="mt-1 text-sm text-slate-500">
        Roster directory for hockey operations staff.
      </p>

      {/* Filter controls */}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <span className="font-medium text-slate-700">Position:</span>
        {(['all', 'F', 'D', 'G'] as const).map((pos) => (
          <Link
            key={pos}
            to="/players"
            search={(prev) => ({ position: pos, status: prev.status ?? 'active' })}
            className={`rounded-md px-3 py-1 ${
              position === pos
                ? 'bg-sky-700 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {pos === 'all' ? 'All' : pos}
          </Link>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
        <span className="font-medium text-slate-700">Status:</span>
        {(['active', 'ir', 'all'] as const).map((s) => (
          <Link
            key={s}
            to="/players"
            search={(prev) => ({ position: prev.position ?? 'all', status: s })}
            className={`rounded-md px-3 py-1 ${
              status === s
                ? 'bg-sky-700 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {s === 'all' ? 'All' : s === 'ir' ? 'IR' : 'Active'}
          </Link>
        ))}
      </div>

      {/* Cross-link to games */}
      <p className="mt-4 text-sm text-slate-500">
        Looking for the schedule?{' '}
        <Link to="/games" search={{ team: '', date: '' }} className="text-sky-700 underline underline-offset-2">
          View games
        </Link>
      </p>

      {/* Directory entries list */}
      {!entries || entries.length === 0 ? (
        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
          <p className="font-medium text-slate-700">No directory entries found</p>
          <p className="mt-1 text-sm text-slate-500">
            Try changing the position or status filter above.
          </p>
          <Link
            to="/players"
            search={{ position: 'all', status: 'active' }}
            className="mt-3 inline-block text-sm text-sky-700 underline underline-offset-2"
          >
            Reset filters
          </Link>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {entries.map((entry) => (
            <li key={entry.id} className="py-3">
              <Link
                to="/players/$playerId"
                params={{ playerId: entry.id }}
                className="group flex items-baseline gap-3"
              >
                <span className="font-mono text-sm text-slate-400">
                  #{entry.number}
                </span>
                <span className="font-medium text-slate-900 group-hover:text-sky-700">
                  {entry.displayName}
                </span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                  {entry.role}
                </span>
                <span className="text-sm text-slate-500">{entry.teamName}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-xs text-slate-400">
        {entries?.length ?? 0} entr{entries?.length !== 1 ? 'ies' : 'y'} shown
      </p>
    </main>
  )
}

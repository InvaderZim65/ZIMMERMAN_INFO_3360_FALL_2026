import { createFileRoute, Link } from '@tanstack/react-router'
import { getDirectoryEntries } from '../server/directory'
import type { DirectoryEntry } from '../server/directory'

export const Route = createFileRoute('/directory')({
  loader: async () => {
    const entries = await getDirectoryEntries({ data: {} })
    return entries
  },
  component: DirectoryPage,
})

function DirectoryPage() {
  const entries = Route.useLoaderData() as DirectoryEntry[]

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold text-slate-900">Directory</h1>
      <p className="mt-1 text-sm text-slate-500">
        Full roster directory loaded from the server.
      </p>

      <p className="mt-4 text-sm text-slate-500">
        Need filters?{' '}
        <Link
          to="/players"
          search={{ position: 'all', status: 'active' }}
          className="text-sky-700 underline underline-offset-2"
        >
          View players with filters
        </Link>
      </p>

      {!entries || entries.length === 0 ? (
        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
          <p className="font-medium text-slate-700">No directory entries found</p>
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
        {entries?.length ?? 0} entr{entries?.length !== 1 ? 'ies' : 'y'} total
      </p>
    </main>
  )
}

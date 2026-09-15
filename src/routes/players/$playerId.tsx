import { createFileRoute, Link } from '@tanstack/react-router'
import { parsePlayerIdParam } from '../../lib/playerParams'
import { getDirectoryEntryById } from '../../server/directory'
import { NotFoundPlayer } from '../../components/NotFoundPlayer'
import type { DirectoryEntry } from '../../server/directory'

export const Route = createFileRoute('/players/$playerId')({
  params: {
    parse: (raw) => ({
      playerId: parsePlayerIdParam(raw.playerId),
    }),
    stringify: ({ playerId }) => ({
      playerId: String(playerId),
    }),
  },
  loader: ({ params }) => getDirectoryEntryById({ data: { id: params.playerId } }),
  component: PlayerDetailPage,
})

function PlayerDetailPage() {
  const { playerId } = Route.useParams()
  const entry = Route.useLoaderData() as DirectoryEntry | null

  if (!entry) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <NotFoundPlayer playerId={playerId} />
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <p className="mb-4 text-sm">
        <Link to="/players" search={{ position: 'all', status: 'active' }} className="text-sky-700 underline underline-offset-2">
          &larr; Back to players
        </Link>
      </p>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-baseline gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">{entry.displayName}</h1>
          <span className="font-mono text-lg text-slate-400">#{entry.number}</span>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="font-medium text-slate-500">Role</dt>
            <dd className="mt-1 text-slate-900">{entry.role}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Team</dt>
            <dd className="mt-1 text-slate-900">{entry.teamName}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Entry ID</dt>
            <dd className="mt-1 font-mono text-slate-700">{entry.id}</dd>
          </div>
        </dl>
      </div>

      <p className="mt-6 text-sm text-slate-500">
        Check the{' '}
        <Link to="/games" search={{ team: '', date: '' }} className="text-sky-700 underline underline-offset-2">
          game schedule
        </Link>{' '}
        for upcoming matchups.
      </p>
    </main>
  )
}

import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { parsePlayerIdParam } from '../../lib/playerParams'
import { getPlayerById } from '../../server/directoryLoader'
import { NotFoundPlayer } from '../../components/NotFoundPlayer'
import type { SeedPlayer } from '../../data/hockeySeed'

const loadPlayer = createServerFn({ method: 'GET' })
  .validator((input: { playerId: string }) => input)
  .handler(async ({ data }) => {
    return getPlayerById(data.playerId) ?? null
  })

export const Route = createFileRoute('/players/$playerId')({
  params: {
    parse: (raw) => ({
      playerId: parsePlayerIdParam(raw.playerId),
    }),
    stringify: ({ playerId }) => ({
      playerId: String(playerId),
    }),
  },
  loader: ({ params }) => loadPlayer({ data: { playerId: params.playerId } }),
  component: PlayerDetailPage,
})

function PlayerDetailPage() {
  const { playerId } = Route.useParams()
  const player = Route.useLoaderData() as SeedPlayer | null

  if (!player) {
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
          <h1 className="text-2xl font-semibold text-slate-900">{player.name}</h1>
          <span className="font-mono text-lg text-slate-400">#{player.number}</span>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="font-medium text-slate-500">Position</dt>
            <dd className="mt-1 text-slate-900">
              {player.position === 'F' ? 'Forward' : player.position === 'D' ? 'Defense' : 'Goalie'}
            </dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Team</dt>
            <dd className="mt-1 text-slate-900">{player.team}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Player ID</dt>
            <dd className="mt-1 font-mono text-slate-700">{player.id}</dd>
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

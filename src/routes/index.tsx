import { createFileRoute, Link } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { listPlayers, listGames } from '../server/directoryLoader'

const loadHomeCounts = createServerFn({ method: 'GET' }).handler(async () => {
  const players = listPlayers()
  const games = listGames()
  return { playerCount: players.length, gameCount: games.length }
})

export const Route = createFileRoute('/')({
  loader: () => loadHomeCounts(),
  component: HomePage,
})

function HomePage() {
  const { playerCount, gameCount } = Route.useLoaderData()

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold text-slate-900">
        Hockey Ops Player Directory
      </h1>
      <p className="mt-2 text-slate-600">
        Staff landing page for roster and schedule entry points.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <Link
          to="/players"
          search={{ position: 'all', status: 'active' }}
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-300 hover:shadow"
        >
          <p className="text-3xl font-bold text-slate-900">{playerCount}</p>
          <p className="text-sm text-slate-600">Players in directory</p>
        </Link>
        <Link
          to="/games"
          search={{ team: '', date: '' }}
          className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-300 hover:shadow"
        >
          <p className="text-3xl font-bold text-slate-900">{gameCount}</p>
          <p className="text-sm text-slate-600">Games on schedule</p>
        </Link>
      </div>
    </main>
  )
}

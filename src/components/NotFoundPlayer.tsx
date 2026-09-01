import { Link } from '@tanstack/react-router'

export function NotFoundPlayer(props: { playerId: string }) {
  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-6">
      <h1 className="text-xl font-semibold text-slate-900">Player not found</h1>
      <p className="mt-2 text-slate-700">
        No roster entry matches id <code className="rounded bg-white px-1">{props.playerId}</code>.
        The bookmark may be old, or the id was typed incorrectly.
      </p>
      <p className="mt-4">
        <Link
          to="/players"
          search={{ position: 'all', status: 'active' }}
          className="font-medium text-sky-700 underline underline-offset-2"
        >
          Back to players directory
        </Link>
      </p>
    </section>
  )
}

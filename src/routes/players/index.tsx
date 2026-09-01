import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/players/')({
  component: PlayersIndexPage,
})

function PlayersIndexPage() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold text-slate-900">Players</h1>
      <p className="mt-2 text-slate-600">
        Roster directory index for hockey operations staff. Each player will
        get a bookmarkable detail page next.
      </p>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-slate-700">
        <li>Placeholder player row - A. Forward</li>
        <li>Placeholder player row - B. Defense</li>
        <li>Placeholder player row - C. Goalie</li>
      </ul>
    </main>
  )
}

import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/games/')({
  component: GamesIndexPage,
})

function GamesIndexPage() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold text-slate-900">Games</h1>
      <p className="mt-2 text-slate-600">
        Schedule view shell for upcoming and recent games. Filters arrive when
        search params are validated in a later step.
      </p>
      <p className="mt-4 rounded-md bg-slate-100 p-3 text-sm text-slate-700">
        Placeholder: no game rows loaded yet.
      </p>
    </main>
  )
}

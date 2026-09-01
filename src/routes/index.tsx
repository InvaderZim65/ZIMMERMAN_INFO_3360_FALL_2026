import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold text-slate-900">
        Hockey Ops Player Directory
      </h1>
      <p className="mt-2 text-slate-600">
        Staff landing page for roster and schedule entry points. Open Players
        for the directory list or Games for upcoming matchups.
      </p>
      <p className="mt-4 rounded-md bg-slate-100 p-3 text-sm text-slate-700">
        Placeholder: live directory counts will server-render in a later step.
      </p>
    </main>
  )
}

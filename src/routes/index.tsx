import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { getDirectoryEntries } from '../server/directory'
import { supabase } from '../lib/supabase/client'

const SCHEDULE_COUNT = 11 // static game count shown on homepage

export const Route = createFileRoute('/')({
  loader: async () => {
    const entries = await getDirectoryEntries({ data: {} })
    return { playerCount: entries.length, gameCount: SCHEDULE_COUNT }
  },
  component: HomePage,
})

function HomePage() {
  const { playerCount, gameCount } = Route.useLoaderData()
  const [signedIn, setSignedIn] = useState<boolean | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(!!data.session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session)
    })
    return () => subscription.unsubscribe()
  }, [])

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

      {signedIn === false && (
        <p className="mt-6 text-sm text-slate-500">
          Not signed in?{' '}
          <Link
            to="/login"
            className="text-sky-700 underline underline-offset-2"
          >
            Sign in
          </Link>{' '}
          to access all features.
        </p>
      )}
    </main>
  )
}

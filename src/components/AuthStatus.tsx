import { useState, useEffect } from 'react'
import { useRouter } from '@tanstack/react-router'
import { supabase } from '../lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export function AuthStatus() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.navigate({ to: '/login' })
  }

  if (loading) return null

  if (!user) {
    return (
      <button
        onClick={() => router.navigate({ to: '/login' })}
        className="rounded-md px-2 py-1 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
      >
        Sign In
      </button>
    )
  }

  const role =
    (user.app_metadata?.role as string | undefined) ?? 'anonymous'

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-slate-600">{user.email}</span>
      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800">
        {role}
      </span>
      <button
        onClick={handleSignOut}
        className="rounded-md px-2 py-1 font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
      >
        Sign Out
      </button>
    </div>
  )
}

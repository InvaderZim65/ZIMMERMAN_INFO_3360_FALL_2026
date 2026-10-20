import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { createServerClient } from '../supabase/server'

/** Optional session check — returns null when no session exists. Use for UI state. */
export const getAuthSession = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest()
    const cookie = request.headers.get('cookie') ?? ''
    const supabase = createServerClient(cookie)
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error || !session) return null

    return {
      user: {
        id: session.user.id,
        email: session.user.email ?? '',
        role: (session.user.app_metadata?.role as string) ?? 'anonymous',
      },
    }
  },
)

/** Throwing session gate — use in every protected server function. */
export async function requireSession() {
  const request = getRequest()
  const cookie = request.headers.get('cookie') ?? ''
  const supabase = createServerClient(cookie)
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error || !session) {
    throw new Error('Unauthorized: no active session')
  }

  return {
    supabase,
    user: {
      id: session.user.id,
      email: session.user.email ?? '',
      role: (session.user.app_metadata?.role as string) ?? 'anonymous',
    },
  }
}

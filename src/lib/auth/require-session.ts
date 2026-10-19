import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { createServerClient } from '../supabase/server'

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

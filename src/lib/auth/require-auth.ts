import { redirect } from '@tanstack/react-router'
import { supabase } from '../supabase/client'

export async function requireAuth() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw redirect({ to: '/login' })
  const role = (session.user.app_metadata?.role as string) ?? 'anonymous'
  return { user: { id: session.user.id, email: session.user.email ?? '', role } }
}

export async function requireRole(allowedRoles: string[]) {
  const session = await requireAuth()
  if (!allowedRoles.includes(session.user.role)) throw redirect({ to: '/' })
  return session
}

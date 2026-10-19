import { redirect } from '@tanstack/react-router'
import { getAuthSession } from './require-session'

export async function requireAuth() {
  const session = await getAuthSession()
  if (!session) throw redirect({ to: '/login' })
  return session
}

export async function requireRole(allowedRoles: string[]) {
  const session = await requireAuth()
  if (!allowedRoles.includes(session.user.role))
    throw redirect({ to: '/' })
  return session
}

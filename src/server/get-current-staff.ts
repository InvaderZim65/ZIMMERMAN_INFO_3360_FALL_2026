// src/server/get-current-staff.ts
// Server function that returns the authenticated staff member's identity.
// Unlike getAuthSession (which returns null on missing session), this function
// throws so callers can assume a valid session in downstream logic.

import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { createServerClient } from '../lib/supabase/server'

export type StaffUser = {
  id: string
  email: string
  role: string
}

export const getCurrentStaff = createServerFn({ method: 'GET' }).handler(
  async (): Promise<StaffUser> => {
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

    const role =
      (session.user.app_metadata?.role as string) ?? 'anonymous'

    return {
      id: session.user.id,
      email: session.user.email ?? '',
      role,
    }
  },
)

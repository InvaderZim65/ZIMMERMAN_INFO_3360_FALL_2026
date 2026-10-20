// src/server/get-current-staff.ts
// Server function that returns the authenticated staff member's identity.
// Delegates session verification to the shared requireSession gate.

import { createServerFn } from '@tanstack/react-start'
import { requireSession } from '../lib/auth/require-session'

export type StaffUser = {
  id: string
  email: string
  role: string
}

export const getCurrentStaff = createServerFn({ method: 'GET' }).handler(
  async (): Promise<StaffUser> => {
    const { user } = await requireSession()
    return user
  },
)

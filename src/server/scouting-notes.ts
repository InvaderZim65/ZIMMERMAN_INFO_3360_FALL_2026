// src/server/scouting-notes.ts
// Server function that loads scouting events through an authenticated path.
// RLS policies on scouting_events filter rows based on the caller's role,
// so medical-flagged events are automatically hidden from non-medical staff.

import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { createServerClient } from '../lib/supabase/server'

export const getScoutingNotes = createServerFn({ method: 'GET' }).handler(
  async () => {
    const request = getRequest()
    const cookie = request.headers.get('cookie') ?? ''
    const supabase = createServerClient(cookie)

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      throw new Error('Unauthorized: no active session')
    }

    const { data: events, error: queryError } = await supabase
      .from('scouting_events')
      .select('*')
      .order('created_at', { ascending: false })

    if (queryError) {
      console.error('[scouting-notes] Query error:', queryError.message)
      throw new Error('Unable to load scouting events. Please try again later.')
    }

    return events ?? []
  },
)

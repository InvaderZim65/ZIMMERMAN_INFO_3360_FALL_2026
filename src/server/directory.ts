// src/server/directory.ts
// Server function for directory reads. Uses the server-only Supabase client.
// Do NOT import this file's internals from route/component code -- only call
// the exported server function via TanStack Start RPC.

import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '../lib/supabase.server'
import {
  mapRowToDirectoryEntry,
  filterByRole,
  type DirectoryCard,
} from '../lib/directory/mappers'

// Re-export the UI type so routes can import it from here
export type { DirectoryCard as DirectoryEntry } from '../lib/directory/mappers'

export const getDirectoryEntries = createServerFn({ method: 'GET' })
  .validator(
    (input: { search?: string; role?: string; limit?: number }) => input,
  )
  .handler(async ({ data }) => {
    const search = data?.search ?? ''
    const role = data?.role ?? 'all'
    const limit = data?.limit ?? 100

    try {
      const supabase = getSupabaseServerClient()

      let query = supabase
        .from('directory_entries')
        .select('id, full_name, role, team, number, is_active')
        .order('full_name', { ascending: true })
        .limit(limit)

      if (search) {
        query = query.ilike('full_name', `%${search}%`)
      }

      const { data: rows, error } = await query

      if (error) {
        console.error('[directory] Supabase query error:', error.message)
        throw new Error('Unable to load the directory. Please try again later.')
      }

      const entries = (rows ?? []).map(mapRowToDirectoryEntry)
      return filterByRole(entries, role)
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('Unable to load')) {
        throw err
      }
      if (
        err instanceof Error &&
        err.message.includes('Missing SUPABASE')
      ) {
        console.error('[directory] Server config error:', err.message)
        throw new Error('Server configuration error.')
      }
      console.error('[directory] Unexpected error:', err)
      throw new Error('An unexpected error occurred.')
    }
  })

export const getDirectoryEntryById = createServerFn({ method: 'GET' })
  .validator((input: { id: string }) => input)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()

    const { data: row, error } = await supabase
      .from('directory_entries')
      .select('id, full_name, role, team, number, is_active')
      .eq('id', data.id)
      .single()

    if (error || !row) return null
    return mapRowToDirectoryEntry(row)
  })

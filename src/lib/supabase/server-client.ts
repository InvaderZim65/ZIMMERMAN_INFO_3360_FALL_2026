import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'

/**
 * Per-request authenticated server client using the ANON key (not service role)
 * so Row Level Security policies apply to every query.
 */
export function createServerClient(cookieHeader: string) {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? ''
  const supabaseAnonKey =
    process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? ''

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: { headers: { cookie: cookieHeader } },
  })
}

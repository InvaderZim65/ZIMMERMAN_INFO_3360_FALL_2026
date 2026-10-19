// Server Supabase client -- uses ANON key (not service role) so RLS applies.
// See docs/security/auth-session-plan.md and docs/security/require-session-spec.md.
import { createClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database'
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

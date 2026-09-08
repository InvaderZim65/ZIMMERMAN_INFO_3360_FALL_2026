// src/lib/supabase.server.ts
// Server-only Supabase client. Do NOT import this from routes or browser components.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { serverEnv } from '../config/env'

/**
 * Returns a Supabase client authenticated with the service role key.
 * This client bypasses Row Level Security and must only run on the server.
 * Browser auth persistence is disabled because there is no browser here.
 */
export function getSupabaseServerClient(): SupabaseClient {
  const url = serverEnv.SUPABASE_URL
  const serviceRoleKey = serverEnv.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in server environment',
    )
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

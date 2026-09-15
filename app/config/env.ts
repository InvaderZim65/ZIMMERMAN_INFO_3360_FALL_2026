// src/config/env.ts
// Server-only environment variable access. All Supabase credentials are secret
// and must never be exposed to the browser bundle (no VITE_ prefix).

export const serverEnv = {
  get SUPABASE_URL(): string {
    const val = process.env.SUPABASE_URL ?? ''
    if (!val) throw new Error('Missing SUPABASE_URL in server environment')
    return val
  },
  get SUPABASE_SERVICE_ROLE_KEY(): string {
    const val = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    if (!val)
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in server environment')
    return val
  },
} as const

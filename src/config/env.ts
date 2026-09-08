// src/config/env.ts
// Typed environment variable access with public/secret separation.
// Public vars use the VITE_ prefix and may appear in the browser bundle.
// Secret vars have NO prefix and must only be read on the server.

// ── Public (safe for client bundle) ──────────────────────────────────
export const publicEnv = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL as string,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
} as const

// ── Secret (server-only -- never import this object in route/component files) ─
export const serverEnv = {
  get SUPABASE_URL(): string {
    const val = process.env.VITE_SUPABASE_URL ?? ''
    if (!val) throw new Error('Missing VITE_SUPABASE_URL in server environment')
    return val
  },
  get SUPABASE_SERVICE_ROLE_KEY(): string {
    const val = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    if (!val)
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in server environment')
    return val
  },
} as const

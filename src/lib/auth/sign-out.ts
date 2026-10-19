import { supabase } from '../supabase/client'

export type SignOutResult =
  | { ok: true }
  | { ok: false; error: string }

export async function signOut(): Promise<SignOutResult> {
  const { error } = await supabase.auth.signOut()
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

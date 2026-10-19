import { supabase } from '../supabase/client'

export async function listMedicalNotes(playerId?: string) {
  let query = supabase
    .from('player_medical_notes')
    .select('*')
    .order('created_at', { ascending: false })
  if (playerId) query = query.eq('player_id', playerId)
  const { data, error } = await query
  return { data, error }
}

export async function createMedicalNote(note: {
  player_id: string
  note: string
}) {
  const { data, error } = await supabase
    .from('player_medical_notes')
    .insert(note)
    .select()
    .single()
  return { data, error }
}

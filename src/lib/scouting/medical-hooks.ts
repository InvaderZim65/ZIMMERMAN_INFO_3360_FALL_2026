import { useQuery } from '@tanstack/react-query'
import { listMedicalNotes } from './medical-queries'

export function useMedicalNotes(playerId?: string) {
  return useQuery({
    queryKey: ['scouting', 'medical', playerId ?? 'all'],
    queryFn: () => listMedicalNotes(playerId),
  })
}

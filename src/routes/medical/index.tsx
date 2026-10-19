import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { requireRole } from '../../lib/auth/require-auth'
import { useMedicalNotes } from '../../lib/scouting/medical-hooks'
import { createMedicalNote } from '../../lib/scouting/medical-queries'
import { usePlayers } from '../../lib/scouting/hooks'

export const Route = createFileRoute('/medical/')({
  beforeLoad: () => requireRole(['admin', 'medical_staff']),
  component: MedicalPage,
})

function MedicalPage() {
  const queryClient = useQueryClient()
  const { data: notesResult, isLoading, isError, error } = useMedicalNotes()
  const { data: players } = usePlayers()

  const [playerId, setPlayerId] = useState('')
  const [noteText, setNoteText] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaveError(null)
    setSaving(true)
    const { error: err } = await createMedicalNote({
      player_id: playerId,
      note: noteText,
    })
    setSaving(false)
    if (err) {
      setSaveError(err.message)
      return
    }
    setPlayerId('')
    setNoteText('')
    void queryClient.invalidateQueries({ queryKey: ['scouting', 'medical'] })
  }

  const notes = notesResult?.data ?? []

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold text-slate-900">Medical Notes</h1>
      <p className="mt-1 text-sm text-slate-500">
        Restricted view for admin and medical staff.
      </p>

      {/* Add note form */}
      <form
        onSubmit={onSubmit}
        className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
      >
        <h2 className="text-sm font-semibold text-slate-700">
          Add Medical Note
        </h2>

        {saveError && (
          <p
            role="alert"
            className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {saveError}
          </p>
        )}

        <label className="mt-3 block text-sm font-medium text-slate-700">
          Player
          <select
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="">Select a player</option>
            {players?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name} ({p.position ?? 'N/A'})
              </option>
            ))}
          </select>
        </label>

        <label className="mt-3 block text-sm font-medium text-slate-700">
          Note
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            required
            rows={3}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            placeholder="Enter medical observation..."
          />
        </label>

        <button
          type="submit"
          disabled={saving}
          className="mt-3 rounded-md bg-sky-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-800 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Note'}
        </button>
      </form>

      {/* Notes list */}
      {isLoading && <p className="mt-6 text-sm text-slate-500">Loading notes...</p>}
      {isError && (
        <p role="alert" className="mt-6 text-sm text-red-700">
          Could not load notes: {error.message}
        </p>
      )}
      {!isLoading && !isError && notes.length === 0 && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
          <p className="font-medium text-slate-700">No medical notes yet</p>
        </div>
      )}
      {notes.length > 0 && (
        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2">Player ID</th>
                <th className="px-4 py-2">Note</th>
                <th className="px-4 py-2">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {notes.map((n) => (
                <tr key={n.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono text-xs text-slate-600">
                    {n.player_id}
                  </td>
                  <td className="px-4 py-2 text-slate-900">{n.note}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">
                    {new Date(n.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-slate-400">
        {notes.length} note{notes.length !== 1 ? 's' : ''} shown
      </p>
    </main>
  )
}

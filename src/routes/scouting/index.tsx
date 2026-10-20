import { createFileRoute } from '@tanstack/react-router'
import { requireRole } from '../../lib/auth/require-auth'
import { getScoutingNotes } from '../../server/scouting-notes'

export const Route = createFileRoute('/scouting/')({
  beforeLoad: () =>
    requireRole(['admin', 'head_coach', 'assistant_scout', 'medical_staff']),
  loader: () => getScoutingNotes(),
  component: ScoutingIndexPage,
})

function ScoutingIndexPage() {
  const events = Route.useLoaderData()

  return (
    <div>
      <h1>Scouting notes</h1>
      {!events.length && <p>No scouting events found.</p>}
      {!!events.length && (
        <ul>
          {events.map((event) => (
            <li key={event.id}>
              {event.event_type} — player {event.player_id} (game{' '}
              {event.game_id})
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useEvents } from '../../lib/scouting/hooks'
import { useCreateScoutingEvent } from '../../lib/scouting/mutation-hooks'

export const Route = createFileRoute('/scouting/events')({
  component: EventsPage,
})

function EventsPage() {
  const { data, isLoading, isError, error } = useEvents()
  const createEvent = useCreateScoutingEvent()
  const [playerId, setPlayerId] = useState('')
  const [eventType, setEventType] = useState('goal')
  const [gameId, setGameId] = useState('')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    await createEvent.mutateAsync({
      player_id: playerId,
      game_id: gameId,
      event_type: eventType,
    })
    setPlayerId('')
    setGameId('')
  }

  return (
    <div>
      <h1>Events</h1>
      <form onSubmit={onSubmit}>
        <label>
          Player id{' '}
          <input value={playerId} onChange={(e) => setPlayerId(e.target.value)} required />
        </label>
        <label>
          Game id{' '}
          <input value={gameId} onChange={(e) => setGameId(e.target.value)} required />
        </label>
        <label>
          Type{' '}
          <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
            <option value="goal">goal</option>
            <option value="shot">shot</option>
            <option value="hit">hit</option>
          </select>
        </label>
        <button type="submit" disabled={createEvent.isPending}>
          Log event
        </button>
        {createEvent.isError && (
          <p role="alert">Save failed: {createEvent.error.message}</p>
        )}
        {createEvent.isSuccess && <p>Event saved. Lists should refresh.</p>}
      </form>
      {isLoading && <p>Loading events...</p>}
      {isError && <p role="alert">Could not load events: {error.message}</p>}
      {!isLoading && !isError && !data?.length && <p>No events yet.</p>}
      {!!data?.length && (
        <ul>
          {data.map((event) => (
            <li key={event.id}>
              {event.event_type} — player {event.player_id} (game {event.game_id})
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

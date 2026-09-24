import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { usePlayerEventCounts } from '../../lib/scouting/hooks'

export const Route = createFileRoute('/scouting/aggregates')({
  component: AggregatesPage,
})

function AggregatesPage() {
  const [gameId, setGameId] = useState('')
  const { data, isLoading, isError, error } = usePlayerEventCounts(
    gameId || undefined,
  )

  return (
    <div>
      <h1>Player aggregates</h1>
      <label>
        Game id{' '}
        <input
          value={gameId}
          onChange={(e) => setGameId(e.target.value)}
          placeholder="Enter a game UUID"
        />
      </label>
      {isLoading && <p>Loading aggregates...</p>}
      {isError && <p role="alert">Could not load aggregates: {error.message}</p>}
      {!isLoading && !isError && !data?.length && <p>No aggregate rows yet.</p>}
      {!!data?.length && (
        <table>
          <thead>
            <tr>
              <th>Player</th>
              <th>Goals</th>
              <th>Events</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.player_id}>
                <td>{row.player_name ?? row.player_id}</td>
                <td>{row.goal_count}</td>
                <td>{row.event_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

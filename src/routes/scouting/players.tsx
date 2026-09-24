import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { usePlayers } from '../../lib/scouting/hooks'

export const Route = createFileRoute('/scouting/players')({
  component: PlayersPage,
})

function PlayersPage() {
  const [position, setPosition] = useState<string>('')
  const { data, isLoading, isError, error } = usePlayers(
    position ? { position } : undefined,
  )

  if (isLoading) return <p>Loading players...</p>
  if (isError) return <p role="alert">Could not load players: {error.message}</p>
  if (!data?.length) {
    return (
      <div>
        <FilterBar position={position} onPositionChange={setPosition} />
        <p>No players match this filter.</p>
      </div>
    )
  }

  return (
    <div>
      <h1>Players</h1>
      <FilterBar position={position} onPositionChange={setPosition} />
      <ul>
        {data.map((player) => (
          <li key={player.id}>
            {player.full_name} — {player.position}
          </li>
        ))}
      </ul>
    </div>
  )
}

function FilterBar(props: {
  position: string
  onPositionChange: (value: string) => void
}) {
  return (
    <label>
      Position{' '}
      <select
        value={props.position}
        onChange={(e) => props.onPositionChange(e.target.value)}
      >
        <option value="">All</option>
        <option value="F">Forward</option>
        <option value="D">Defense</option>
        <option value="G">Goalie</option>
      </select>
    </label>
  )
}

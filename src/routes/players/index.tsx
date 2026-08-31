import { createFileRoute } from '@tanstack/react-router'

// Players list route: /players
// Full player list UI and seed data come in a later step.
export const Route = createFileRoute('/players/')({
  component: PlayersIndex,
})

function PlayersIndex() {
  return (
    <div>
      <h2 className="text-2xl font-bold">Players</h2>
      <p className="mt-2 text-gray-600">Player list will be built here.</p>
    </div>
  )
}

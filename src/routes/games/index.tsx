import { createFileRoute } from '@tanstack/react-router'

// Games list route: /games
// Full games list UI and seed data come in a later step.
export const Route = createFileRoute('/games/')({
  component: GamesIndex,
})

function GamesIndex() {
  return (
    <div>
      <h2 className="text-2xl font-bold">Games</h2>
      <p className="mt-2 text-gray-600">Games schedule will be built here.</p>
    </div>
  )
}

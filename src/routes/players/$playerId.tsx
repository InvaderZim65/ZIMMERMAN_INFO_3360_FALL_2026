import { createFileRoute } from '@tanstack/react-router'

// Player detail route: /players/$playerId
// The $playerId segment is dynamic — each player gets a bookmarkable URL.
// Validation and seed data come in a later step.
export const Route = createFileRoute('/players/$playerId')({
  component: PlayerDetail,
})

function PlayerDetail() {
  // useParams gives us the playerId from the URL
  const { playerId } = Route.useParams()

  return (
    <div>
      <h2 className="text-2xl font-bold">Player Detail</h2>
      <p className="mt-2 text-gray-600">
        Showing player: <strong>{playerId}</strong>
      </p>
      <p className="mt-1 text-gray-500">
        Full player card will be built here.
      </p>
    </div>
  )
}

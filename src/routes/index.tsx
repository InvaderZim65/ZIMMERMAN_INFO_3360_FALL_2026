import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold">Hockey Ops Player Directory</h1>
      <p className="mt-2 text-gray-600">
        Skeleton app running. Routes and player data come next.
      </p>
    </div>
  )
}

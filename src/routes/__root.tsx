import type { ReactNode } from 'react'
import {
  Link,
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Hockey Ops Player Directory' },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  return (
    <RootDocument>
      {/* Shared header and nav for every page */}
      <header className="bg-gray-900 text-white p-4">
        <h1 className="text-xl font-bold">Hockey Ops Directory</h1>
        <nav className="mt-2 flex gap-4 text-sm">
          <Link to="/" className="hover:underline">
            Home
          </Link>
          <Link to="/players" className="hover:underline">
            Players
          </Link>
          <Link to="/games" className="hover:underline">
            Games
          </Link>
        </nav>
      </header>

      {/* Child route content renders here */}
      <main className="p-4">
        <Outlet />
      </main>
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}

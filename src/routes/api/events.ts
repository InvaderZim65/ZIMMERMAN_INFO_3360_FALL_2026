// src/routes/api/events.ts
// API route handler for game event ingestion.
// Delegates to the server function in src/server/events.ts.
//
// TanStack Start server functions are callable directly via RPC, but this
// file provides a conventional REST-style entry point at /api/events for
// external providers that POST JSON.

import { json } from '@tanstack/react-start'
import { createAPIFileRoute } from '@tanstack/react-start/api'
import { ingestGameEvent } from '../../server/events'

export const APIRoute = createAPIFileRoute('/api/events')({
  POST: async ({ request }) => {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return json(
        { errors: [{ field: '_body', message: 'Invalid JSON in request body' }] },
        { status: 400 },
      )
    }

    const result = await ingestGameEvent({ data: body })

    switch (result.status) {
      case 201:
        return json(result.data, { status: 201 })
      case 200:
        return json(result.data, { status: 200 })
      case 400:
        return json({ errors: result.errors }, { status: 400 })
      case 401:
        return json({ error: result.error }, { status: 401 })
      case 409:
        return json({ error: result.error }, { status: 409 })
      default:
        return json(
          { error: 'error' in result ? result.error : 'Internal server error' },
          { status: 500 },
        )
    }
  },
})

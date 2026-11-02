// src/routes/api/evaluations.ts
// API route handler for evaluation form submission.
// Delegates to the server function in src/server/evaluations.ts.

import { json } from '@tanstack/react-start'
import { createAPIFileRoute } from '@tanstack/react-start/api'
import { submitEvaluation } from '../../server/evaluations'

export const APIRoute = createAPIFileRoute('/api/evaluations')({
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

    const result = await submitEvaluation({ data: body })

    switch (result.status) {
      case 201:
        return json(result.data, { status: 201 })
      case 400:
        return json({ errors: result.errors }, { status: 400 })
      case 401:
        return json({ error: result.error }, { status: 401 })
      default:
        return json(
          { error: 'error' in result ? result.error : 'Internal server error' },
          { status: 500 },
        )
    }
  },
})

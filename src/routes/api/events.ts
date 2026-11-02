/**
 * POST /api/events — game event ingestion route.
 *
 * Imports and calls validateEventPayload from the validation module.
 * Returns status codes and error shapes from openapi/hockey-ingestion.yaml.
 * Persistence and authentication are out of scope for this step.
 */

import { json } from "@tanstack/react-start";
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { validateEventPayload } from "../../server/validation/event-payload";

export const APIRoute = createAPIFileRoute("/api/events")({
  POST: async ({ request }) => {
    // Parse JSON — unreadable JSON is a documented client error, not a crash.
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json(
        {
          error: {
            code: "BAD_REQUEST",
            message: "Request body must be valid JSON.",
            details: [],
          },
        },
        { status: 400 },
      );
    }

    // Validate against the contract schema.
    const result = validateEventPayload(body);

    if (!result.ok) {
      return json(
        {
          error: {
            code: "VALIDATION_FAILED",
            message: "One or more fields are invalid.",
            details: result.errors,
          },
        },
        { status: 422 },
      );
    }

    // Stub success — persistence is out of scope for this step.
    return json(
      {
        id: "00000000-0000-0000-0000-000000000000",
        ...result.data,
        created_at: new Date().toISOString(),
      },
      { status: 201 },
    );
  },
});

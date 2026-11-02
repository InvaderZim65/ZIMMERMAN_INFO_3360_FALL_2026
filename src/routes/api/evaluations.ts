/**
 * POST /api/evaluations — coach evaluation submission route.
 *
 * Imports and calls validateEvaluationPayload from the validation module.
 * Returns status codes and error shapes from openapi/hockey-ingestion.yaml.
 * Persistence and authentication are out of scope for this step.
 * coach_id would be derived from the authenticated session in a later step.
 */

import { json } from "@tanstack/react-start";
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { validateEvaluationPayload } from "../../server/validation/evaluation-payload";

export const APIRoute = createAPIFileRoute("/api/evaluations")({
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
    const result = validateEvaluationPayload(body);

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

    // Stub success — persistence and auth are out of scope for this step.
    return json(
      {
        id: "00000000-0000-0000-0000-000000000000",
        coach_id: "00000000-0000-0000-0000-000000000000",
        ...result.data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { status: 201 },
    );
  },
});

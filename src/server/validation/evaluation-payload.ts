/**
 * Server-side validation for POST /evaluations.
 * Matches the EvaluationInput schema in openapi/hockey-ingestion.yaml.
 * The server never trusts the client.
 *
 * coach_id is never accepted from client input. It is derived from
 * the authenticated session in the route handler.
 */

import type { FieldError, ValidationResult } from "./field-errors";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface EvaluationInput {
  game_id: string;
  player_id: string;
  rating: number;
  notes?: string;
}

export function validateEvaluationPayload(
  body: unknown,
): ValidationResult<EvaluationInput> {
  const errors: FieldError[] = [];

  if (body === null || typeof body !== "object") {
    return {
      ok: false,
      errors: [{ field: "body", code: "INVALID_TYPE", message: "Request body must be a JSON object" }],
    };
  }

  const obj = body as Record<string, unknown>;

  // game_id — required, uuid
  if (obj.game_id === undefined || obj.game_id === null || obj.game_id === "") {
    errors.push({ field: "game_id", code: "REQUIRED", message: "game_id is required" });
  } else if (typeof obj.game_id !== "string" || !UUID_RE.test(obj.game_id)) {
    errors.push({ field: "game_id", code: "INVALID_FORMAT", message: "game_id must be a valid UUID" });
  }

  // player_id — required, uuid
  if (obj.player_id === undefined || obj.player_id === null || obj.player_id === "") {
    errors.push({ field: "player_id", code: "REQUIRED", message: "player_id is required" });
  } else if (typeof obj.player_id !== "string" || !UUID_RE.test(obj.player_id)) {
    errors.push({ field: "player_id", code: "INVALID_FORMAT", message: "player_id must be a valid UUID" });
  }

  // rating — required, integer 1-5
  if (obj.rating === undefined || obj.rating === null) {
    errors.push({ field: "rating", code: "REQUIRED", message: "rating is required" });
  } else if (typeof obj.rating !== "number" || !Number.isInteger(obj.rating) || obj.rating < 1 || obj.rating > 5) {
    errors.push({ field: "rating", code: "OUT_OF_RANGE", message: "rating must be an integer between 1 and 5" });
  }

  // notes — optional, string if present
  if (obj.notes !== undefined && obj.notes !== null) {
    if (typeof obj.notes !== "string") {
      errors.push({ field: "notes", code: "INVALID_TYPE", message: "notes must be a string" });
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      game_id: obj.game_id as string,
      player_id: obj.player_id as string,
      rating: obj.rating as number,
      notes: obj.notes as string | undefined,
    },
  };
}

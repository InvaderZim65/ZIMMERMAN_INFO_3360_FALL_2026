/**
 * Server-side validation for POST /events.
 * Matches the GameEventInput schema in openapi/hockey-ingestion.yaml.
 * The server never trusts the client.
 */

import type { FieldError, ValidationResult } from "./field-errors";

const VALID_EVENT_TYPES = ["goal", "assist", "penalty", "save", "shot"] as const;
type EventType = (typeof VALID_EVENT_TYPES)[number];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface GameEventInput {
  game_id: string;
  event_type: EventType;
  player_id?: string;
  period: number;
  game_clock?: string;
  provider_event_id: string;
  provider_timestamp?: string;
  details?: Record<string, unknown>;
}

export function validateEventPayload(
  body: unknown,
): ValidationResult<GameEventInput> {
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

  // event_type — required, enum
  if (obj.event_type === undefined || obj.event_type === null || obj.event_type === "") {
    errors.push({ field: "event_type", code: "REQUIRED", message: "event_type is required" });
  } else if (typeof obj.event_type !== "string" || !VALID_EVENT_TYPES.includes(obj.event_type as EventType)) {
    errors.push({
      field: "event_type",
      code: "INVALID_VALUE",
      message: `event_type must be one of: ${VALID_EVENT_TYPES.join(", ")}`,
    });
  }

  // period — required, integer 1-4
  if (obj.period === undefined || obj.period === null) {
    errors.push({ field: "period", code: "REQUIRED", message: "period is required" });
  } else if (typeof obj.period !== "number" || !Number.isInteger(obj.period) || obj.period < 1 || obj.period > 4) {
    errors.push({ field: "period", code: "OUT_OF_RANGE", message: "period must be an integer between 1 and 4" });
  }

  // provider_event_id — required, string
  if (obj.provider_event_id === undefined || obj.provider_event_id === null || obj.provider_event_id === "") {
    errors.push({ field: "provider_event_id", code: "REQUIRED", message: "provider_event_id is required" });
  } else if (typeof obj.provider_event_id !== "string") {
    errors.push({ field: "provider_event_id", code: "INVALID_TYPE", message: "provider_event_id must be a string" });
  }

  // player_id — optional, uuid if present
  if (obj.player_id !== undefined && obj.player_id !== null && obj.player_id !== "") {
    if (typeof obj.player_id !== "string" || !UUID_RE.test(obj.player_id)) {
      errors.push({ field: "player_id", code: "INVALID_FORMAT", message: "player_id must be a valid UUID" });
    }
  }

  // provider_timestamp — optional, ISO date-time if present
  if (obj.provider_timestamp !== undefined && obj.provider_timestamp !== null) {
    if (typeof obj.provider_timestamp !== "string" || isNaN(Date.parse(obj.provider_timestamp))) {
      errors.push({
        field: "provider_timestamp",
        code: "INVALID_FORMAT",
        message: "provider_timestamp must be a valid ISO 8601 date-time",
      });
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      game_id: obj.game_id as string,
      event_type: obj.event_type as EventType,
      player_id: obj.player_id as string | undefined,
      period: obj.period as number,
      game_clock: obj.game_clock as string | undefined,
      provider_event_id: obj.provider_event_id as string,
      provider_timestamp: obj.provider_timestamp as string | undefined,
      details: obj.details as Record<string, unknown> | undefined,
    },
  };
}

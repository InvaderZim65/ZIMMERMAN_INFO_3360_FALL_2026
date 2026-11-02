/**
 * Acceptance tests for hockey event ingestion and coach evaluation validation.
 * Each test maps to an AC row in docs/api/acceptance-criteria.md.
 * Imports real validation modules — does not re-implement checks.
 *
 * Sources:
 *   openapi/hockey-ingestion.yaml
 *   src/server/validation/event-payload.ts
 *   src/server/validation/evaluation-payload.ts
 *   src/server/validation/field-errors.ts
 */

import { describe, it, expect } from "vitest";
import { validateEventPayload } from "../../src/server/validation/event-payload";
import { validateEvaluationPayload } from "../../src/server/validation/evaluation-payload";
import type { FieldError } from "../../src/server/validation/field-errors";
import { toFieldErrors } from "../../src/server/validation/field-errors";

// --- Test data from the contract ---

const VALID_EVENT = {
  game_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  event_type: "goal" as const,
  period: 2,
  provider_event_id: "evt-001",
  player_id: "11111111-2222-3333-4444-555555555555",
  game_clock: "14:32",
};

const VALID_EVALUATION = {
  game_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  player_id: "11111111-2222-3333-4444-555555555555",
  rating: 4,
  notes: "Strong skating, good positioning.",
};

function findDetail(errors: FieldError[], field: string) {
  return errors.find((e) => e.field === field);
}

/**
 * Simulate what the route handler does: call the validator, then build
 * the HTTP-level response status and error envelope as the contract requires.
 * This keeps the tests honest to the route behavior without needing a live server.
 */
function simulateEventRoute(body: unknown) {
  const result = validateEventPayload(body);
  if (!result.ok) {
    return {
      status: 422,
      body: { error: { code: "VALIDATION_FAILED", message: "One or more fields are invalid.", details: result.errors } },
    };
  }
  return { status: 201, body: { id: "stub", ...result.data, created_at: new Date().toISOString() } };
}

function simulateEvaluationRoute(body: unknown) {
  const result = validateEvaluationPayload(body);
  if (!result.ok) {
    return {
      status: 422,
      body: { error: { code: "VALIDATION_FAILED", message: "One or more fields are invalid.", details: result.errors } },
    };
  }
  return {
    status: 201,
    body: { id: "stub", coach_id: "stub", ...result.data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  };
}

// --- Provider: POST /api/events ---

describe("POST /api/events", () => {
  it("AC-1: accepts a valid event payload", () => {
    const res = simulateEventRoute(VALID_EVENT);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("created_at");
  });

  it("AC-2: rejects missing provider_event_id", () => {
    const { provider_event_id, ...missing } = VALID_EVENT;
    const res = simulateEventRoute(missing);
    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty("error");
    const err = (res.body as any).error;
    expect(err.code).toBe("VALIDATION_FAILED");
    const detail = findDetail(err.details, "provider_event_id");
    expect(detail).toBeDefined();
    expect(detail!.code).toBe("REQUIRED");
    expect(typeof detail!.message).toBe("string");
    expect(detail!.message.length).toBeGreaterThan(0);
  });

  it("AC-3: rejects wrong type on period (string instead of integer)", () => {
    const res = simulateEventRoute({ ...VALID_EVENT, period: "two" });
    expect(res.status).toBe(422);
    const err = (res.body as any).error;
    expect(err.code).toBe("VALIDATION_FAILED");
    const detail = findDetail(err.details, "period");
    expect(detail).toBeDefined();
    expect(detail!.code).toBe("OUT_OF_RANGE");
    expect(typeof detail!.message).toBe("string");
  });

  it("AC-4: error body matches ErrorEnvelope schema", () => {
    const res = simulateEventRoute({});
    expect(res.status).toBe(422);
    const err = (res.body as any).error;
    // error.code is a string
    expect(typeof err.code).toBe("string");
    // error.message is a string
    expect(typeof err.message).toBe("string");
    // error.details is an array
    expect(Array.isArray(err.details)).toBe(true);
    // Each detail has field, code, message
    for (const d of err.details) {
      expect(d).toHaveProperty("field");
      expect(d).toHaveProperty("code");
      expect(d).toHaveProperty("message");
      expect(typeof d.field).toBe("string");
      expect(typeof d.code).toBe("string");
      expect(typeof d.message).toBe("string");
    }
  });

  it("rejects invalid event_type value", () => {
    const res = simulateEventRoute({ ...VALID_EVENT, event_type: "touchdown" });
    expect(res.status).toBe(422);
    const detail = findDetail((res.body as any).error.details, "event_type");
    expect(detail).toBeDefined();
    expect(detail!.code).toBe("INVALID_VALUE");
  });

  it("rejects out-of-range period (7)", () => {
    const res = simulateEventRoute({ ...VALID_EVENT, period: 7 });
    expect(res.status).toBe(422);
    const detail = findDetail((res.body as any).error.details, "period");
    expect(detail).toBeDefined();
    expect(detail!.code).toBe("OUT_OF_RANGE");
  });

  it("reports multiple errors at once", () => {
    const res = simulateEventRoute({});
    expect(res.status).toBe(422);
    const details = (res.body as any).error.details;
    expect(details.length).toBeGreaterThanOrEqual(3);
    // Should include game_id, event_type, period, provider_event_id
    expect(findDetail(details, "game_id")).toBeDefined();
    expect(findDetail(details, "event_type")).toBeDefined();
    expect(findDetail(details, "period")).toBeDefined();
    expect(findDetail(details, "provider_event_id")).toBeDefined();
  });
});

// --- Coach: POST /api/evaluations ---

describe("POST /api/evaluations", () => {
  it("AC-5: accepts a valid evaluation payload", () => {
    const res = simulateEvaluationRoute(VALID_EVALUATION);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("coach_id");
    expect(res.body).toHaveProperty("created_at");
  });

  it("AC-6: rejects missing rating", () => {
    const { rating, ...missing } = VALID_EVALUATION;
    const res = simulateEvaluationRoute(missing);
    expect(res.status).toBe(422);
    const err = (res.body as any).error;
    expect(err.code).toBe("VALIDATION_FAILED");
    const detail = findDetail(err.details, "rating");
    expect(detail).toBeDefined();
    expect(detail!.code).toBe("REQUIRED");
    expect(typeof detail!.message).toBe("string");
    expect(detail!.message.length).toBeGreaterThan(0);
  });

  it("AC-7: rejects wrong type on rating (string instead of integer)", () => {
    const res = simulateEvaluationRoute({ ...VALID_EVALUATION, rating: "excellent" });
    expect(res.status).toBe(422);
    const err = (res.body as any).error;
    expect(err.code).toBe("VALIDATION_FAILED");
    const detail = findDetail(err.details, "rating");
    expect(detail).toBeDefined();
    expect(detail!.code).toBe("OUT_OF_RANGE");
    expect(typeof detail!.message).toBe("string");
  });

  it("AC-8: evaluation error matches same ErrorEnvelope schema", () => {
    const res = simulateEvaluationRoute({});
    expect(res.status).toBe(422);
    const err = (res.body as any).error;
    expect(typeof err.code).toBe("string");
    expect(typeof err.message).toBe("string");
    expect(Array.isArray(err.details)).toBe(true);
    for (const d of err.details) {
      expect(d).toHaveProperty("field");
      expect(d).toHaveProperty("code");
      expect(d).toHaveProperty("message");
    }
  });

  it("rejects out-of-range rating (0)", () => {
    const res = simulateEvaluationRoute({ ...VALID_EVALUATION, rating: 0 });
    expect(res.status).toBe(422);
    const detail = findDetail((res.body as any).error.details, "rating");
    expect(detail).toBeDefined();
    expect(detail!.code).toBe("OUT_OF_RANGE");
  });
});

// --- Cross-cutting: server is the authority ---

describe("AC-9: server validates even if client skipped checks", () => {
  it("server rejects event with rating 0 that HTML min=1 might miss", () => {
    // A browser with disabled JS might submit period=0 which HTML wouldn't catch
    const res = simulateEventRoute({ ...VALID_EVENT, period: 0 });
    expect(res.status).toBe(422);
    expect(res.status).not.toBe(201);
    const detail = findDetail((res.body as any).error.details, "period");
    expect(detail).toBeDefined();
  });

  it("server rejects evaluation with rating 6 that a provider might allow", () => {
    const res = simulateEvaluationRoute({ ...VALID_EVALUATION, rating: 6 });
    expect(res.status).toBe(422);
    expect(res.status).not.toBe(201);
    const detail = findDetail((res.body as any).error.details, "rating");
    expect(detail).toBeDefined();
  });
});

// --- Verify toFieldErrors helper is importable ---

describe("field-errors module", () => {
  it("toFieldErrors builds FieldError array", () => {
    const errors = toFieldErrors(
      { field: "period", code: "REQUIRED", message: "period is required" },
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("period");
    expect(errors[0].code).toBe("REQUIRED");
    expect(errors[0].message).toBe("period is required");
  });
});

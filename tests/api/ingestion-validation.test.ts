/**
 * Acceptance tests for event ingestion and evaluation validation.
 * Each test maps to an AC row in docs/api/acceptance-criteria.md.
 * Imports the real validation modules — does not re-implement checks.
 */

import { describe, it, expect } from "vitest";
import { validateEventPayload } from "../../src/server/validation/event-payload";
import { validateEvaluationPayload } from "../../src/server/validation/evaluation-payload";

// --- Helpers ---

const VALID_EVENT = {
  game_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  event_type: "goal",
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

function findDetail(errors: Array<{ field: string; code: string; message: string }>, field: string) {
  return errors.find((e) => e.field === field);
}

// --- Event Ingestion ---

describe("POST /events validation", () => {
  it("AC-1: accepts a valid event payload", () => {
    const result = validateEventPayload(VALID_EVENT);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.game_id).toBe(VALID_EVENT.game_id);
      expect(result.data.event_type).toBe("goal");
      expect(result.data.period).toBe(2);
      expect(result.data.provider_event_id).toBe("evt-001");
    }
  });

  it("AC-2: rejects a payload missing provider_event_id", () => {
    const { provider_event_id, ...missing } = VALID_EVENT;
    const result = validateEventPayload(missing);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const detail = findDetail(result.errors, "provider_event_id");
      expect(detail).toBeDefined();
      expect(detail!.code).toBe("REQUIRED");
    }
  });

  it("AC-3: rejects invalid event_type", () => {
    const result = validateEventPayload({ ...VALID_EVENT, event_type: "touchdown" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const detail = findDetail(result.errors, "event_type");
      expect(detail).toBeDefined();
      expect(detail!.code).toBe("INVALID_VALUE");
    }
  });

  it("AC-4: rejects out-of-range period", () => {
    const result = validateEventPayload({ ...VALID_EVENT, period: 7 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const detail = findDetail(result.errors, "period");
      expect(detail).toBeDefined();
      expect(detail!.code).toBe("OUT_OF_RANGE");
    }
  });

  it("AC-5: rejects non-object body", () => {
    const result = validateEventPayload(null);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it("rejects missing game_id", () => {
    const { game_id, ...missing } = VALID_EVENT;
    const result = validateEventPayload(missing);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const detail = findDetail(result.errors, "game_id");
      expect(detail).toBeDefined();
      expect(detail!.code).toBe("REQUIRED");
    }
  });

  it("rejects invalid game_id format", () => {
    const result = validateEventPayload({ ...VALID_EVENT, game_id: "not-a-uuid" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const detail = findDetail(result.errors, "game_id");
      expect(detail).toBeDefined();
      expect(detail!.code).toBe("INVALID_FORMAT");
    }
  });

  it("reports multiple errors at once", () => {
    const result = validateEventPayload({ game_id: "bad", event_type: "invalid", period: 99 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    }
  });
});

// --- Evaluation Submission ---

describe("POST /evaluations validation", () => {
  it("AC-6: accepts a valid evaluation payload", () => {
    const result = validateEvaluationPayload(VALID_EVALUATION);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.game_id).toBe(VALID_EVALUATION.game_id);
      expect(result.data.player_id).toBe(VALID_EVALUATION.player_id);
      expect(result.data.rating).toBe(4);
    }
  });

  it("AC-7: rejects a payload missing rating", () => {
    const { rating, ...missing } = VALID_EVALUATION;
    const result = validateEvaluationPayload(missing);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const detail = findDetail(result.errors, "rating");
      expect(detail).toBeDefined();
      expect(detail!.code).toBe("REQUIRED");
    }
  });

  it("AC-8: rejects out-of-range rating", () => {
    const result = validateEvaluationPayload({ ...VALID_EVALUATION, rating: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const detail = findDetail(result.errors, "rating");
      expect(detail).toBeDefined();
      expect(detail!.code).toBe("OUT_OF_RANGE");
    }
  });

  it("AC-9: reports multiple errors at once", () => {
    const result = validateEvaluationPayload({ game_id: VALID_EVALUATION.game_id });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const playerDetail = findDetail(result.errors, "player_id");
      const ratingDetail = findDetail(result.errors, "rating");
      expect(playerDetail).toBeDefined();
      expect(ratingDetail).toBeDefined();
    }
  });

  it("rejects non-object body", () => {
    const result = validateEvaluationPayload("not an object");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it("rejects invalid player_id format", () => {
    const result = validateEvaluationPayload({ ...VALID_EVALUATION, player_id: "bad" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      const detail = findDetail(result.errors, "player_id");
      expect(detail).toBeDefined();
      expect(detail!.code).toBe("INVALID_FORMAT");
    }
  });
});

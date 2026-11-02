# Acceptance Criteria: Hockey Event Ingestion and Evaluation Forms

## How to read these cases

Each case uses Given / When / Then:

- **Given** — the starting situation
- **When** — the HTTP request someone sends (method, path, body)
- **Then** — the response `openapi/hockey-ingestion.yaml` already promises

Do not invent fields, paths, or status codes here. Quote them from the contract
and from the server schemas the routes already import.

- Contract: `openapi/hockey-ingestion.yaml`
- Routes: `src/routes/api/events.ts`, `src/routes/api/evaluations.ts`
- Schemas: `src/server/validation/event-payload.ts`, `src/server/validation/evaluation-payload.ts`
- Errors: `src/server/validation/field-errors.ts`

## Provider: ingest a hockey event

### AC-1: Valid event is accepted

- **Given:** a complete event payload with game_id (UUID), event_type ("goal"), period (2), provider_event_id ("evt-001"), and player_id (UUID)
- **When:** `POST /api/events` is sent with that body
- **Then:** the response status is `201 Created`
- **And:** the response body includes an id and created_at

### AC-2: Missing required event field is rejected

- **Given:** an event payload that omits `provider_event_id`
- **When:** `POST /api/events` is sent with that body
- **Then:** the response status is `422`
- **And:** the error body has `error.code` = `VALIDATION_FAILED` and `error.details` contains an entry where `field` is `"provider_event_id"`, `code` is `"REQUIRED"`, and `message` is a human-readable sentence

### AC-3: Wrong type on event field is rejected

- **Given:** an event payload where `period` is the string `"two"` instead of an integer
- **When:** `POST /api/events` is sent with that body
- **Then:** the response status is `422`
- **And:** the error body has `error.details` containing an entry where `field` is `"period"`, `code` is `"OUT_OF_RANGE"`, and `message` names the constraint

### AC-4: Structured field errors for events

- **Given:** any invalid event payload from AC-2 or AC-3
- **When:** the server rejects it
- **Then:** the body matches the contract's ErrorEnvelope schema: `error.code` (string), `error.message` (string), and `error.details` (array of objects each with `field`, `code`, and `message`)

## Coach: submit an evaluation form

### AC-5: Valid evaluation is accepted

- **Given:** a complete evaluation payload with game_id (UUID), player_id (UUID), rating (4), and notes ("Strong skating")
- **When:** `POST /api/evaluations` is sent with that body
- **Then:** the response status is `201 Created`
- **And:** the response body includes an id, coach_id, and created_at

### AC-6: Missing required evaluation field is rejected

- **Given:** an evaluation payload that omits `rating`
- **When:** `POST /api/evaluations` is sent with that body
- **Then:** the response status is `422`
- **And:** the error body has `error.code` = `VALIDATION_FAILED` and `error.details` contains an entry where `field` is `"rating"`, `code` is `"REQUIRED"`, and `message` is a human-readable sentence

### AC-7: Wrong type on evaluation field is rejected

- **Given:** an evaluation payload where `rating` is the string `"excellent"` instead of an integer
- **When:** `POST /api/evaluations` is sent with that body
- **Then:** the response status is `422`
- **And:** the error body has `error.details` containing an entry where `field` is `"rating"`, `code` is `"OUT_OF_RANGE"`, and `message` names the constraint

### AC-8: Structured field errors for evaluations

- **Given:** any invalid evaluation payload from AC-6 or AC-7
- **When:** the server rejects it
- **Then:** the body matches the same ErrorEnvelope schema used for events: `error.code`, `error.message`, and `error.details` array with `field`, `code`, `message` per item

## Cross-cutting: the server is the authority

### AC-9: Client-side checks are not enough

- **Given:** a payload that a browser required-attribute or a provider's own validator might have allowed through (for example, an evaluation with `rating` as `0`, which HTML min=1 could miss if JavaScript is disabled)
- **When:** it reaches `POST /api/events` or `POST /api/evaluations`
- **Then:** the server still runs `validateEventPayload` or `validateEvaluationPayload` from the schema modules
- **And:** invalid input never receives status `201`; it always receives `422` with a field-level error the sender can act on

## Traceability

| Case | OpenAPI path + method | Validation module | Test name |
|---|---|---|---|
| AC-1 | `POST /api/events` (201 in YAML) | `src/server/validation/event-payload.ts` | `AC-1: accepts a valid event payload` |
| AC-2 | `POST /api/events` (422 in YAML) | `src/server/validation/event-payload.ts` | `AC-2: rejects missing provider_event_id` |
| AC-3 | `POST /api/events` (422 in YAML) | `src/server/validation/event-payload.ts` | `AC-3: rejects wrong type on period` |
| AC-4 | `POST /api/events` (422 in YAML) | `src/server/validation/field-errors.ts` | `AC-4: error body matches ErrorEnvelope schema` |
| AC-5 | `POST /api/evaluations` (201 in YAML) | `src/server/validation/evaluation-payload.ts` | `AC-5: accepts a valid evaluation payload` |
| AC-6 | `POST /api/evaluations` (422 in YAML) | `src/server/validation/evaluation-payload.ts` | `AC-6: rejects missing rating` |
| AC-7 | `POST /api/evaluations` (422 in YAML) | `src/server/validation/evaluation-payload.ts` | `AC-7: rejects wrong type on rating` |
| AC-8 | `POST /api/evaluations` (422 in YAML) | `src/server/validation/field-errors.ts` | `AC-8: evaluation error matches same ErrorEnvelope` |
| AC-9 | both `POST` paths | route handlers + `event-payload.ts` + `evaluation-payload.ts` | `AC-9: server rejects even if client skipped checks` |

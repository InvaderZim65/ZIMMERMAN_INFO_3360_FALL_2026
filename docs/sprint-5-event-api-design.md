# Sprint 5 -- Event Ingestion API Design

## Actors

| Actor            | Description                                           |
|------------------|-------------------------------------------------------|
| Event Provider   | External system (stat tracker, arena feed) that sends game events in real time |
| Coach            | Authenticated staff member who submits post-game evaluation forms |
| Backend (Nitro)  | TanStack Start server functions that validate, deduplicate, and persist data |
| Supabase         | Postgres database with RLS -- stores game_events and evaluation_forms |

## Goals

1. Accept game events (goals, assists, penalties, saves, shots) from one or more providers without double-counting.
2. Accept post-game evaluation forms from coaches.
3. Return clear, field-level validation errors so callers can fix payloads without guessing.
4. Handle duplicate submissions, out-of-order arrivals, and late corrections gracefully.

## Resource Model

### game_events

Represents a single in-game occurrence reported by an event provider.

| Field               | Type        | Required | Notes                              |
|---------------------|-------------|----------|------------------------------------|
| provider_id         | text        | yes      | Identifies the sending system      |
| provider_event_id   | text        | yes      | Provider's own unique ID for this event |
| game_id             | uuid        | yes      | FK to games table                  |
| event_type          | text        | yes      | One of: goal, assist, penalty, save, shot |
| player_id           | uuid        | no       | FK to players table (nullable for team-level events) |
| period              | integer     | yes      | 1-4                                |
| game_clock          | text        | no       | Display clock value, e.g. "12:34"  |
| details             | jsonb       | no       | Provider-specific extra data       |
| provider_timestamp  | timestamptz | no       | When the provider says the event happened |

Idempotency key = `provider_id + ":" + provider_event_id` (stored as `idempotency_key`).

### evaluation_forms

Represents a coach's post-game rating for a single player.

| Field     | Type    | Required | Notes                   |
|-----------|---------|----------|-------------------------|
| game_id   | uuid    | yes      | FK to games             |
| coach_id  | uuid    | yes      | Auth user ID of coach   |
| player_id | uuid    | yes      | FK to players           |
| rating    | integer | yes      | 1-5 scale               |
| notes     | text    | no       | Free-text comments      |

## Endpoints

### POST /api/events

Ingests a single game event.

- **Request body:** JSON matching game_events fields above.
- **201 Created:** Event stored. Returns the created record.
- **200 OK:** Duplicate detected (same idempotency key, same data). Returns the existing record.
- **409 Conflict:** Same idempotency key but different payload. Caller must resolve.
- **400 Bad Request:** Validation failed. Body contains `{ errors: [{ field, message }] }`.
- **401 Unauthorized:** Missing or invalid session.

### POST /api/evaluations

Submits a player evaluation form.

- **Request body:** JSON matching evaluation_forms fields above.
- **201 Created:** Evaluation stored. Returns the created record.
- **400 Bad Request:** Validation errors.
- **401 Unauthorized:** Missing or invalid session.

## Status Code Summary

| Code | Meaning                        | When                                      |
|------|--------------------------------|-------------------------------------------|
| 200  | OK (idempotent replay)         | Duplicate event, same data                |
| 201  | Created                        | New event or evaluation stored             |
| 400  | Bad Request                    | Validation errors in request body          |
| 401  | Unauthorized                   | No session or session expired              |
| 409  | Conflict                       | Idempotency key reused with different data |
| 500  | Internal Server Error          | Unexpected database or server failure      |

## Workflow: Event Ingestion

1. Provider sends POST /api/events with JSON body.
2. Server validates all fields (schema.ts + validate.ts).
3. If validation fails, return 400 with field-level errors.
4. Build idempotency_key from provider_id + provider_event_id.
5. Check if a row with that idempotency_key already exists.
   - If yes and data matches: return 200 with existing row.
   - If yes and data differs: return 409 Conflict.
6. Insert new row. Return 201 with created record.

## Workflow: Evaluation Submission

1. Coach sends POST /api/evaluations with JSON body.
2. Server validates fields.
3. If validation fails, return 400 with field-level errors.
4. Insert row with coach_id from the authenticated session.
5. Return 201 with created record.

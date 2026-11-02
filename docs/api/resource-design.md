# Resource Design: Hockey Event Ingestion and Coach Evaluations

Source: [docs/scoping/resource-inventory.md](../scoping/resource-inventory.md)

## Purpose

This document defines the resource-oriented HTTP endpoints for the hockey event ingestion API and the coach evaluation submission API. Every path names a resource (a noun the system stores), not an action. Every operation is checked against the resource inventory. Later steps will attach status codes and build an OpenAPI contract from this design.

## Conventions

- Paths are resource nouns in plural form.
- The HTTP method expresses the action (POST = create, GET = fetch). The path never contains a verb.
- Every in-scope row names a caller: either the third-party provider or the coach.
- Operations the inventory did not authorize belong in the "Explicitly Out of Scope" section, not here.

## Resource: Game Events

Collection path: `/events`
Item path: `/events/{event_id}`

### Operations Table

| Operation | Method | Path | Caller | Description |
|---|---|---|---|---|
| Create a game event | POST | /events | Third-party hockey data provider | Provider pushes a single game event (goal, assist, penalty, save, shot) into the app |
| List game events | GET | /events | Coach, provider | Retrieve events, optionally filtered by game_id or player_id |
| Get one game event | GET | /events/{event_id} | Coach, provider | Retrieve a single stored event by its ID |

## Resource: Evaluations

Collection path: `/evaluations`
Item path: `/evaluations/{evaluation_id}`

### Operations Table

| Operation | Method | Path | Caller | Description |
|---|---|---|---|---|
| Submit an evaluation | POST | /evaluations | Coach | Coach submits a completed player evaluation form for a game or practice |
| List evaluations | GET | /evaluations | Coach | Retrieve evaluations, optionally filtered by player_id or game_id |
| Get one evaluation | GET | /evaluations/{evaluation_id} | Coach | Retrieve a single evaluation by its ID |

## Caller Matrix

| Caller | POST /events | GET /events | GET /events/{id} | POST /evaluations | GET /evaluations | GET /evaluations/{id} |
|---|---|---|---|---|---|---|
| Third-party provider | Yes | Yes | Yes | No | No | No |
| Coach | No | Yes | Yes | Yes | Yes | Yes |

## Explicitly Out of Scope

| Operation | Method | Path | Reason |
|---|---|---|---|
| Update a game event | PUT or PATCH | /events/{event_id} | Inventory open question: whether corrections are allowed is not yet decided |
| Delete a game event | DELETE | /events/{event_id} | Client story does not authorize the provider or coach to remove events |
| Update an evaluation | PUT or PATCH | /evaluations/{evaluation_id} | Inventory open question: draft-vs-submitted is not yet decided |
| Delete an evaluation | DELETE | /evaluations/{evaluation_id} | Client story does not mention removing evaluations |
| Bulk event ingestion | POST | /events/batch | Not in the client story; may be added in a later sprint if the provider requests it |

## Review Log

### Cycle 1: Resource versus Action

- All paths use plural nouns: `/events`, `/evaluations`.
- No path contains a verb like "submit," "push," "create," or "ingest."
- Methods (POST, GET) express the intent, not the path.
- No changes needed.

### Cycle 2: Missing Reads and Unsafe Updates

- GET for both collections and individual items is included for events and evaluations.
- PUT, PATCH, and DELETE are explicitly moved to out-of-scope with reasons tied to open questions in the inventory.
- No unauthorized operations remain in the in-scope table.

## Open Decisions

1. **Event corrections:** If the team decides a provider can correct an event, a PATCH /events/{event_id} operation should be added with clear rules about what fields can change.
2. **Draft evaluations:** If draft saves are allowed, POST /evaluations may need a `status` field (draft vs submitted) and PATCH /evaluations/{evaluation_id} would be added.
3. **Provider authentication:** How the server verifies that a POST /events request is from the authorized provider, not an impersonator.

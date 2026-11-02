# Resource Design: Hockey Event Ingestion and Coach Evaluations

Source: [docs/scoping/resource-inventory.md](../scoping/resource-inventory.md)

## Purpose

This document defines the resource-oriented HTTP endpoints for the hockey event ingestion API and the coach evaluation submission API. Every path names a resource (a noun the system stores), not an action. Every operation is checked against the resource inventory. Later steps will attach status codes and build an OpenAPI contract from this design.

## Conventions

- Paths are resource nouns in plural form.
- The HTTP method expresses the action (POST = create, GET = fetch). The path never contains a verb.
- Every in-scope row names exactly one caller.
- Operations the inventory did not authorize belong in the "Explicitly Out of Scope" section, not here.

## Resource: Game Events

Collection path: `/events`
Item path: `/events/{event_id}`

### Operations Table

| Operation | Method | Path | Caller | Description |
|---|---|---|---|---|
| Create a game event | POST | /events | Third-party hockey data provider | Provider pushes a single game event (goal, assist, penalty, save, shot) into the app |

## Resource: Evaluations

Collection path: `/evaluations`
Item path: `/evaluations/{evaluation_id}`

### Operations Table

| Operation | Method | Path | Caller | Description |
|---|---|---|---|---|
| Submit an evaluation | POST | /evaluations | Coach | Coach submits a completed player evaluation form for a game or practice |

## Caller Matrix

| Caller | POST /events | POST /evaluations |
|---|---|---|
| Third-party provider | Yes | No |
| Coach | No | Yes |

## Explicitly Out of Scope

| Operation | Method | Path | Reason |
|---|---|---|---|
| List game events | GET | /events | The inventory does not explicitly authorize a list-all-events read for either caller |
| Get one game event | GET | /events/{event_id} | The inventory does not explicitly authorize a single-event read for either caller |
| List evaluations | GET | /evaluations | The inventory does not explicitly authorize a list-evaluations read for the coach |
| Get one evaluation | GET | /evaluations/{evaluation_id} | The inventory does not explicitly authorize a single-evaluation read for the coach |
| Update a game event | PUT or PATCH | /events/{event_id} | Open question: whether corrections are allowed is not yet decided |
| Delete a game event | DELETE | /events/{event_id} | Client story does not authorize removing events |
| Update an evaluation | PUT or PATCH | /evaluations/{evaluation_id} | Open question: draft-vs-submitted is not yet decided |
| Delete an evaluation | DELETE | /evaluations/{evaluation_id} | Client story does not mention removing evaluations |
| Bulk event ingestion | POST | /events/batch | Not in the client story; may be added later if the provider requests it |

## Review Log

### Cycle 1: Resource versus Action

- Checked path `/events`: plural noun, names the thing stored. Accepted.
- Checked path `/evaluations`: plural noun, names the thing stored. Accepted.
- Considered and rejected `/pushGameEvent`: verb-based action path. The verb "push" belongs in the HTTP method (POST), not the URL.
- Considered and rejected `/submitEvaluation`: verb-based action path. "Submit" is an action, not a resource.
- Considered and rejected `/ingest`: verb describing a process, not a storable thing.

### Cycle 2: Missing Reads and Unsafe Updates

- Compared every GET, PUT, PATCH, and DELETE against the inventory.
- Moved GET /events, GET /events/{event_id}, GET /evaluations, GET /evaluations/{evaluation_id} to Explicitly Out of Scope because the inventory only authorizes creating events (provider) and submitting evaluations (coach). Reads were not explicitly authorized.
- Moved PUT, PATCH, DELETE for both resources to Explicitly Out of Scope with reasons tied to open questions.
- No unauthorized operations remain in the in-scope tables.

## Open Decisions

1. **Event corrections:** If the team decides a provider can correct an event, PATCH /events/{event_id} should be added.
2. **Draft evaluations:** If draft saves are allowed, the evaluation resource may need a status field and PATCH support.
3. **Provider authentication:** How the server verifies POST /events requests come from the authorized provider.
4. **Read access:** If coaches or the provider need to retrieve stored events or evaluations, GET operations should be promoted from out-of-scope after the inventory is updated.

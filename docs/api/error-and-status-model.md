# HTTP Status Codes and Structured Error Model

Source: [docs/api/resource-design.md](./resource-design.md)

## Purpose

This document assigns HTTP status codes to every in-scope operation from the resource design and defines the structured error shape that every failed request returns. The error model is the team agreement: every consumer (the provider's integration code, the coach's browser form) can rely on the same shape.

## Status Code Assignments

### POST /events (Caller: Third-party hockey data provider)

| Outcome | Status Code | Meaning |
|---|---|---|
| Event accepted and stored | 201 Created | A new game event resource was created successfully |
| Request body is missing required fields or has invalid values | 422 Unprocessable Entity | The server understood the request but the payload fails validation |
| Request body is not valid JSON | 400 Bad Request | The server cannot parse the request at all |
| Provider is not authenticated | 401 Unauthorized | The caller did not provide valid credentials |

### POST /evaluations (Caller: Coach)

| Outcome | Status Code | Meaning |
|---|---|---|
| Evaluation accepted and stored | 201 Created | A new evaluation resource was created successfully |
| Form is missing required fields or has invalid values | 422 Unprocessable Entity | The server understood the request but the payload fails validation |
| Request body is not valid JSON | 400 Bad Request | The server cannot parse the request at all |
| Coach is not authenticated | 401 Unauthorized | The caller did not provide valid credentials |

## Why These Codes

- **201 Created**, not 200 OK, because POST creates a new resource. 200 is for reads and updates, not creates.
- **422 Unprocessable Entity**, not 400, for validation errors because the JSON is parseable but the content is wrong. 400 means the server cannot even read the request.
- **401 Unauthorized** for missing or invalid credentials. This is separate from 403 Forbidden, which would mean "I know who you are but you are not allowed." Auth design is an open question, so only 401 is listed here.

## Structured Error Model

Every 422 response returns the same JSON shape. This is the team agreement so both the provider's code and the coach's form can parse errors the same way.

### Error Response Shape

```json
{
  "errors": [
    {
      "field": "period",
      "message": "period is required"
    },
    {
      "field": "event_type",
      "message": "event_type must be one of: goal, assist, penalty, save, shot"
    }
  ]
}
```

### Rules

1. The top-level key is always `errors`, and it is always an array, even for a single error.
2. Each error object has exactly two keys: `field` (the name of the input field that failed) and `message` (a human-readable sentence explaining what is wrong).
3. Every required field that is missing gets its own error entry. The response lists all failures at once, not just the first one.
4. The `message` is plain language a coach can read, not a code or a regex pattern.
5. A 400 response (unparseable JSON) does not use this shape because there are no fields to name. It returns `{ "error": "Request body must be valid JSON" }`.

### Example: Valid Event (201 Created)

Request:
```json
{
  "game_id": "abc-123",
  "event_type": "goal",
  "player_id": "player-456",
  "period": 2,
  "game_clock": "14:32",
  "provider_event_id": "evt-789"
}
```

Response (201):
```json
{
  "id": "generated-uuid",
  "game_id": "abc-123",
  "event_type": "goal",
  "player_id": "player-456",
  "period": 2,
  "game_clock": "14:32",
  "provider_event_id": "evt-789",
  "created_at": "2026-11-02T12:00:00Z"
}
```

### Example: Invalid Event (422 Unprocessable Entity)

Request:
```json
{
  "game_id": "abc-123",
  "event_type": "touchdown",
  "period": 7
}
```

Response (422):
```json
{
  "errors": [
    {
      "field": "event_type",
      "message": "event_type must be one of: goal, assist, penalty, save, shot"
    },
    {
      "field": "period",
      "message": "period must be between 1 and 4"
    },
    {
      "field": "provider_event_id",
      "message": "provider_event_id is required"
    }
  ]
}
```

## Open Decisions

1. **Auth error shape:** Whether 401 responses should use the same `errors` array or a simpler `{ "error": "..." }` shape depends on the auth design in a later sprint.
2. **Rate limiting:** If the provider sends too many requests, a 429 Too Many Requests status may be needed. Not in scope now.
3. **Conflict on duplicate:** If idempotency is added later, a duplicate event with conflicting data may need 409 Conflict. This depends on the reliability topic in the next tutorial.

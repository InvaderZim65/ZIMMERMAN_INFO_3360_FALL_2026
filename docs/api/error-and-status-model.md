# HTTP Status Codes and Structured Error Model

Source: [docs/api/resource-design.md](./resource-design.md)

## Purpose

This document assigns HTTP status codes to every operation in the resource design and defines the single error envelope that every failed request returns. Both resources (game events and evaluations) share the same envelope so the provider's integration code and the coach's browser form can rely on one parse path.

## Decision: 400 vs 422 vs 200-with-failure

- **400 Bad Request** means the HTTP request itself is unusable: the body is not valid JSON, a required Content-Type header is missing, or the request cannot be parsed at all. The server could not even look at the fields.
- **422 Unprocessable Entity** means the JSON was parsed successfully but one or more field values fail the business rules (missing required field, out-of-range period, unknown event type).
- **This API never returns 200 with `success: false` or a hidden error inside a 200 body.** If something is wrong, the status code is a 4xx. A 200 always means the request succeeded.

## Status Code Map

### POST /events (Caller: Third-party hockey data provider)

| Outcome | Status Code | Meaning |
|---|---|---|
| Event accepted and stored | 201 Created | A new game event resource was created |
| JSON parsed but fields fail validation | 422 Unprocessable Entity | The payload has bad or missing field values |
| Request is not parseable HTTP/JSON | 400 Bad Request | The server cannot read the request at all |
| Caller did not provide valid credentials | 401 Unauthorized | Missing or invalid identity token |
| Caller is authenticated but not the authorized provider | 403 Forbidden | Known caller, not allowed to create events |
| Duplicate provider_event_id for an event already stored | 409 Conflict | The provider sent an event with a provider_event_id that already exists with different data. This is not a validation error (422) because the payload is well-formed; it conflicts with an existing record. Hockey example: the provider pushes a goal event for player 8 at 14:32 in period 2, then minutes later pushes a different event (an assist for player 12 at 14:32 in period 2) using the same provider_event_id. The server rejects the second push with 409 because the key is already taken by a different event. |

### POST /evaluations (Caller: Coach)

| Outcome | Status Code | Meaning |
|---|---|---|
| Evaluation accepted and stored | 201 Created | A new evaluation resource was created |
| JSON parsed but fields fail validation | 422 Unprocessable Entity | The payload has bad or missing field values |
| Request is not parseable HTTP/JSON | 400 Bad Request | The server cannot read the request at all |
| Caller did not provide valid credentials | 401 Unauthorized | Missing or invalid identity token |
| Caller is authenticated but not a coach | 403 Forbidden | Known caller, not allowed to submit evaluations |

### GET /events (Out of scope, listed for completeness)

| Outcome | Status Code | Meaning |
|---|---|---|
| Events returned | 200 OK | The list of events matching the query |
| Caller did not provide valid credentials | 401 Unauthorized | Missing or invalid identity |

### GET /events/{event_id} (Out of scope, listed for completeness)

| Outcome | Status Code | Meaning |
|---|---|---|
| Event found | 200 OK | The requested event resource |
| Event does not exist | 404 Not Found | No event with that ID exists in the system. 404 is not used for validation errors. |
| Caller did not provide valid credentials | 401 Unauthorized | Missing or invalid identity |

### GET /evaluations (Out of scope, listed for completeness)

| Outcome | Status Code | Meaning |
|---|---|---|
| Evaluations returned | 200 OK | The list of evaluations matching the query |
| Caller did not provide valid credentials | 401 Unauthorized | Missing or invalid identity |

### GET /evaluations/{evaluation_id} (Out of scope, listed for completeness)

| Outcome | Status Code | Meaning |
|---|---|---|
| Evaluation found | 200 OK | The requested evaluation resource |
| Evaluation does not exist | 404 Not Found | No evaluation with that ID exists |
| Caller did not provide valid credentials | 401 Unauthorized | Missing or invalid identity |

## Shared Error Envelope

Every 400, 401, 403, 404, 409, and 422 response uses the same JSON envelope. Both event ingestion and evaluation submission return this identical shape.

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "One or more fields are invalid.",
    "details": [
      {
        "field": "period",
        "code": "REQUIRED",
        "message": "period is required"
      },
      {
        "field": "event_type",
        "code": "INVALID_VALUE",
        "message": "event_type must be one of: goal, assist, penalty, save, shot"
      }
    ]
  }
}
```

### Envelope Rules

1. The top-level key is always `error` (singular object, not an array).
2. `error.code` is a machine-readable string (e.g., `VALIDATION_FAILED`, `CONFLICT`, `NOT_FOUND`, `UNAUTHORIZED`, `FORBIDDEN`, `BAD_REQUEST`).
3. `error.message` is a human-readable summary sentence.
4. `error.details` is an array of field-level problems. Each item has `field`, `code`, and `message`. The array is empty for errors that are not field-specific (401, 403, 404).
5. Every required field that fails gets its own entry in `details`. The response lists all failures at once, not just the first one.

### Error Codes by Status

| Status | error.code | details present? | Example |
|---|---|---|---|
| 400 | BAD_REQUEST | Empty array | Body is not valid JSON |
| 401 | UNAUTHORIZED | Empty array | No token or expired token |
| 403 | FORBIDDEN | Empty array | Coach trying to POST /events |
| 404 | NOT_FOUND | Empty array | GET /events/{id} where id does not exist |
| 409 | CONFLICT | One entry naming the conflicting field | Duplicate provider_event_id |
| 422 | VALIDATION_FAILED | One entry per failing field | Missing period, bad event_type |

### Example: 409 Conflict (Duplicate Provider Event)

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "An event with this provider_event_id already exists with different data.",
    "details": [
      {
        "field": "provider_event_id",
        "code": "DUPLICATE_KEY",
        "message": "provider_event_id evt-789 is already stored for a different event"
      }
    ]
  }
}
```

### Example: 422 Validation Failed (Evaluation)

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "One or more fields are invalid.",
    "details": [
      {
        "field": "rating",
        "code": "OUT_OF_RANGE",
        "message": "rating must be between 1 and 5"
      },
      {
        "field": "player_id",
        "code": "REQUIRED",
        "message": "player_id is required"
      }
    ]
  }
}
```

## Out of Scope

- **5xx server errors:** Internal failures use standard HTTP 500 without a custom envelope. Designing a server-error format is deferred.
- **Token issuance:** How auth tokens are created, refreshed, or revoked is a later sprint concern. This document only names 401 and 403 as possible responses.
- **Database tables:** Storage design is not part of the status-code model. The error envelope describes what the API returns, not how data is stored.

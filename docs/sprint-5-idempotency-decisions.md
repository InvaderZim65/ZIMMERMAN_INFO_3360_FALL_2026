# Sprint 5 -- Idempotency Decision Table

## Key Concept

Every game event is identified by a composite idempotency key:

```
idempotency_key = provider_id + ":" + provider_event_id
```

This key is stored as a UNIQUE column on the game_events table.

## Decision Table

| # | Scenario                 | Condition                                         | Action                                  | HTTP Status |
|---|--------------------------|---------------------------------------------------|-----------------------------------------|-------------|
| 1 | First submission         | No row with this idempotency_key                  | INSERT new row                          | 201 Created |
| 2 | Exact duplicate          | Row exists, all fields match                      | Return existing row, no write           | 200 OK      |
| 3 | Key collision, data diff | Row exists, one or more fields differ             | Reject -- caller must resolve           | 409 Conflict|
| 4 | Out-of-order arrival     | Event B arrives before Event A (by game_clock)    | Accept both as-is; ordering is display concern | 201 each |
| 5 | Late correction          | Provider sends corrected data for same event      | Rejected (hits scenario 3). Provider must use a new provider_event_id or submit via a correction endpoint (future sprint) | 409 Conflict |
| 6 | Partial batch failure    | Batch of N events, some fail validation           | Each event processed independently; valid ones stored, invalid ones return 400 | Mixed |
| 7 | Provider outage / retry  | Provider retries after timeout, event already stored | Same as scenario 2 -- idempotent replay | 200 OK |
| 8 | Missing provider_event_id | provider_event_id is empty or absent             | Validation error before idempotency check | 400 Bad Request |
| 9 | Unknown provider_id      | provider_id not in any allowlist (future)         | Currently accepted; allowlist is a future enhancement | 201 Created |

## Out-of-Order Handling

Events are stored with `received_at` (server clock) and optionally `provider_timestamp` (provider clock). The ingestion layer does not reorder or reject based on timing. Display and analytics layers are responsible for sorting by `provider_timestamp` or `game_clock`.

Rationale: providers may batch events or experience network delays. Rejecting "late" events would cause data loss.

## Late Corrections

Sprint 5 does not support in-place correction of an existing event. If a provider needs to correct data:

1. The 409 response signals the key is already used.
2. The provider should issue a new event with a new `provider_event_id` (e.g., appending `-corrected`).
3. A future sprint may add a PATCH endpoint that allows overwriting fields on an existing event, gated by a `correction_reason` field.

## Partial Batch Failure

The current API accepts one event per request. If a caller sends events in a loop, each call is independent. A failure on event 3 of 10 does not roll back events 1-2, and the caller can retry event 3 alone.

A future batch endpoint (POST /api/events/batch) could accept an array and return per-item results.

## Storage Rule

```
IF no row with idempotency_key exists:
    INSERT and return 201
ELSE IF existing row data matches incoming data:
    return 200 with existing row (no write)
ELSE:
    return 409 Conflict (no write)
```

Fields compared for "data matches": game_id, event_type, player_id, period, game_clock, details. The provider_timestamp and received_at fields are excluded from comparison because timestamps may drift between retries.

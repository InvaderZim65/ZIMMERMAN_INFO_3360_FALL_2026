# Sprint 5 -- Provider Retry Note

## What Is Safe to Retry

**POST /api/events is safe to retry with the same payload.**

The idempotency key (provider_id + provider_event_id) guarantees that sending the same event twice produces the same result:

- First call: 201 Created (event stored).
- Second call with identical data: 200 OK (existing record returned, no duplicate created).

Providers experiencing network timeouts or uncertain delivery should retry freely. There is no retry limit enforced by the server.

## What Is NOT Safe

- Retrying with a **different payload** for the same provider_event_id will return **409 Conflict**. This is intentional -- it prevents silent data corruption. If the provider needs to correct an event, it must use a new provider_event_id.

- Retrying **without a provider_event_id** will fail validation (400) every time, because provider_event_id is required.

## Recommended Provider Behavior

1. Always include a stable `provider_id` and `provider_event_id` in every request.
2. On network timeout or 5xx response: retry the same request after a short delay (1-2 seconds).
3. On 200: the event was already stored. No further action needed.
4. On 409: do not retry. Investigate why the payload differs from what was previously stored.
5. On 400: fix the validation errors and resubmit.

## Evaluation Forms

POST /api/evaluations does **not** have idempotency protection. Submitting the same evaluation twice will create two records. Coaches should avoid double-clicking submit. A client-side guard (disable button after first click) is recommended. Server-side uniqueness may be added in a future sprint.

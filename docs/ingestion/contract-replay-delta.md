# Contract Replay Delta: What the Endpoint Promises on a Replay

Sources:
- [docs/ingestion/idempotency-key-decision.md](./idempotency-key-decision.md)
- [docs/ingestion/event-outcome-decision-table.md](./event-outcome-decision-table.md)

## The replay promise in plain language

When the provider sends an event that the app already accepted (same provider event identifier), the ingestion endpoint returns the original stored record as a success. It does not create a second stored event. One goal stays one goal. The provider can stop retrying.

## What this adds to the existing contract

The existing `POST /api/events` description in `openapi/hockey-ingestion.yaml` should be updated to state:

> If the provider event identifier in the request matches an event already stored, the server returns the existing record. No second event is created. The provider receives a success response and can stop retrying.

This is a one-sentence addition to the existing operation description. It records the replay promise without changing anything else.

## What must not change

- No new endpoints, paths, or resources.
- No changes to HTTP status codes or the error model.
- No changes to validation schemas or required fields.
- No SQL, storage code, or database design.
- No rewrite of the evaluation endpoint.
- The existing success and error responses stay exactly as they are.

## Why this delta is enough

The decision table already says a duplicate must not double a stat. The key decision already says the provider's event identifier is what makes two deliveries the same event. This note connects those two decisions to the contract: a replay of that key returns the original success. The contract now states the promise. Later steps will implement the storage rule and the code that enforces it.

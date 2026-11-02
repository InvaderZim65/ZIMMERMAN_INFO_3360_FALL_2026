# Contract Replay Delta: What the Endpoint Promises on a Replay

Sources:
- [docs/ingestion/idempotency-key-decision.md](./idempotency-key-decision.md) — chose the provider's stable event identifier as the idempotency key
- [docs/ingestion/event-outcome-decision-table.md](./event-outcome-decision-table.md) — the exact-duplicate row says one goal stays one goal, and the sender hears "Already saved"

## The replay promise in plain language

When the provider sends an event whose provider event identifier (the key chosen in the idempotency-key decision) matches an event already stored, the ingestion endpoint returns `201` with the original stored `GameEvent` record. A replay is not an error. The event was already accepted, so the provider gets the same success status and body it would have seen the first time. No second event is created. This matches the exact-duplicate row in the decision table: the stat does not change, and the provider can stop retrying.

## What this adds to the existing contract

One sentence was added to the `POST /api/events` description in `openapi/hockey-ingestion.yaml`:

> If the provider event identifier in the request matches an event already stored, the server returns the existing record. No second event is created. The provider receives a success response and can stop retrying.

This is an addition to the existing file. No second contract file was created.

## What must not change

- No new endpoints, paths, or resources.
- No changes to HTTP status codes or the error model.
- No changes to validation schemas or required fields.
- No SQL, storage code, or database design.
- No rewrite of the evaluation endpoint.
- No second OpenAPI file. The edit is in the existing `openapi/hockey-ingestion.yaml`.

## Post-edit review of the contract diff

| Check | Result |
|---|---|
| What changed in `openapi/hockey-ingestion.yaml` | Three sentences added to the `POST /api/events` description stating the replay promise. Nothing else changed. |
| Was a second contract file created? | No. The edit is in the existing file only. |
| Were endpoints, status codes, or validation rewritten? | No. The only change is the description text on the existing `POST /api/events` operation. |
| Does the edit match the replay promise? | Yes. The added text says a matching provider event identifier returns the existing record with no second event. |
| Does the edit match the exact-duplicate outcome from the decision table? | Yes. The decision table says the stat does not change and the sender hears "Already saved." The contract now says the server returns the existing record, which is the same outcome. |
| Does the edit use the key from the idempotency-key decision? | Yes. The added text references the provider event identifier, which is the key chosen in the idempotency-key decision. |

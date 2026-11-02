# Reliability Stakeholder Handoff

To: Coaching staff, hockey operations lead, and the provider integration team

## What we set out to do

The hockey data provider can send the same event more than once after a timeout, an outage, or a network drop. Without protection, one real goal becomes two in the coach's stats. This tutorial added reliability rules so a retried event never doubles a stat, a late-arriving event is still stored, and a corrected event updates the record instead of creating a contradictory second entry.

## What we decided

Every decision below is documented in the linked file. This handoff restates the outcomes, not the implementation.

### Idempotency key

The provider assigns a stable event identifier before sending. That identifier is what tells our system "this is the same event again" versus "this is a new event."

Source: [docs/ingestion/idempotency-key-decision.md](./idempotency-key-decision.md)

### Duplicate protection

A retried event with the same identifier and the same details does not create a second stat. The system finds the stored record and returns it without inserting again.

Source: [docs/ingestion/event-outcome-decision-table.md](./event-outcome-decision-table.md) (exact-duplicate row)

### Out-of-order arrival

An event that arrives late (after a later event) is still stored because it has a different identifier. Stats follow stored events, not arrival order.

Source: [docs/ingestion/event-outcome-decision-table.md](./event-outcome-decision-table.md) (out-of-order row)

### Partial batch and outage replay

If a batch is interrupted or the provider replays after an outage, already-stored events are recognized and not duplicated. Missing events are stored for the first time.

Source: [docs/ingestion/event-outcome-decision-table.md](./event-outcome-decision-table.md) (partial-batch and outage rows)

### Late correction

A corrected event (same identifier, different details) updates the stored record. The coach sees the corrected stat, not the original. There is still one event.

Source: [docs/ingestion/late-correction-handling.md](./late-correction-handling.md)

### Replay promise

The contract now states that a replayed event returns the stored record as a success. This was confirmed in the replay comparison.

Sources: [docs/ingestion/contract-replay-delta.md](./contract-replay-delta.md), [docs/ingestion/replay-comparison.md](./replay-comparison.md)

### Provider guidance

A note was written for the provider explaining what is safe to retry and what is not.

Source: [docs/ingestion/provider-retry-note.md](./provider-retry-note.md)

## What coaches can trust

After these decisions, a coach looking at the app sees:
- One goal per real goal, even if the provider sent it twice.
- All events from a period, even if some arrived late or out of order.
- Corrected stats when the provider fixes a mistake.
- No phantom events from outage replays or partial batch retries.

## What is still open

- **Provider version numbers:** The current system uses latest-arrival to resolve corrections sent out of order. A provider-assigned version or sequence number would be more reliable but is not in the contract yet.
- **Authentication:** The provider is not yet verified by identity. The reliability rules assume the sender is the authorized provider. Identity verification is a separate concern from the first Sprint 5 tutorial.
- **Persistence:** The storage rule is implemented but storage is still stubbed. Database tables and real persistence come in a later sprint.
- **Bulk correction endpoint:** If the provider needs to correct many events at once, a batch correction mechanism may be needed. Not in scope now.

## All source documents and their decisions

| # | File | Plain-language decision |
|---|---|---|
| 1 | `docs/ingestion/duplicate-delivery-impact.md` | Explains why the provider can send the same event twice and what one double-counted goal costs coaches. |
| 2 | `docs/ingestion/event-outcome-decision-table.md` | States the correct stored-stat outcome for each of the five messy delivery cases. |
| 3 | `docs/ingestion/idempotency-key-decision.md` | The provider's stable event identifier is the key. Arrival time, server-generated IDs, and full-payload hashes were rejected. |
| 4 | `docs/ingestion/contract-replay-delta.md` | A replay of a stored key returns the existing record as 201. No second event. |
| 5 | `docs/ingestion/storage-rule.md` | New key = store. Same key + same data = return stored record, no insert. Same key + different data = update. A save must be durable before confirming. |
| 6 | `docs/ingestion/storage-implementation-review.md` | All five decision-table cases passed the agent's implementation. |
| 7 | `docs/ingestion/replay-prediction.md` | Sealed prediction of a 4-delivery replay before running it. |
| 8 | `docs/ingestion/replay-comparison.md` | Actual results matched the prediction. No mismatches. |
| 9 | `docs/ingestion/late-correction-handling.md` | A same-key resend with different data updates the record. Latest-arrival ordering is a known limitation. |

## Consistency pass

I compared all nine source files listed above. No contradictions were found. The storage rule matches the decision table. The replay comparison confirmed the prediction. The late-correction handling matches the decision table's late-correction row. The provider retry note points to the correct source documents instead of inventing its own rules.

## What the next topic must reuse, not redo

The next sprint topic must build on top of these existing pieces, not replace them:

- The ingestion endpoint (`POST /api/events`) and the evaluation endpoint (`POST /api/evaluations`)
- The HTTP status codes and error model (`docs/api/error-and-status-model.md`)
- The OpenAPI contract (`openapi/hockey-ingestion.yaml`)
- The server-side validation schemas (`src/server/validation/`)
- The idempotency key (the provider's event identifier)
- The replay promise (same key + same data = return stored record)
- The storage rule (new key = store, duplicate = skip, correction = update)
- The correction rule (same key + different data = update, not reject)
- The provider retry note
- The existing GitHub repository and Vercel Hobby project

If any of these need to change, the source documents must be updated first. Do not invent a parallel set of rules.

## How to verify

The replay comparison in [docs/ingestion/replay-comparison.md](./replay-comparison.md) confirmed that a duplicate does not inflate stats and an out-of-order event is stored correctly. The storage implementation review in [docs/ingestion/storage-implementation-review.md](./storage-implementation-review.md) graded all five decision-table cases as passing. The acceptance criteria and tests from the first tutorial are in [docs/api/acceptance-criteria.md](../api/acceptance-criteria.md) and [tests/api/ingestion-validation.test.ts](../../tests/api/ingestion-validation.test.ts).

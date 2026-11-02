# Storage Rule: How the App Saves a Hockey Event

Sources:
- [docs/ingestion/event-outcome-decision-table.md](./event-outcome-decision-table.md)
- [docs/ingestion/idempotency-key-decision.md](./idempotency-key-decision.md)
- [docs/ingestion/contract-replay-delta.md](./contract-replay-delta.md)

## The rule in plain language

When a validated event arrives at the ingestion endpoint, the app checks whether the provider's event identifier (the idempotency key from the key decision) is already stored.

### New event (key not stored)

This is a new event. Save it to durable storage. The stat is counted once. Return `201` with the stored `GameEvent` record.

### Exact replay (key already stored, data matches)

This is a retry after a timeout. The event was already accepted. Do not insert a second row. Do not count the stat again. Return `201` with the original stored `GameEvent` record, exactly as the contract replay promise states. Returning the stored record is not a second insert. The provider can stop retrying.

### Late correction (key already stored, data is different)

The decision table says: the original record is updated to reflect the correction. The stat reflects the corrected facts, not the original. There is still one event, not two.

### Partial batch (some keys stored, some not)

As stated in the decision table's partial-batch row: the provider retries a batch of five events after a connection drop. Three are already stored. The app checks each event by its key. Already-stored events are recognized and not inserted again. The two that were never saved are stored now. The stats show exactly five events, not eight. For each event the app tells the sender: "Already saved" or "Saved." If any event in the batch was not saved, the batch as a whole is not a complete success. The provider must check which events got "Not saved" and retry only those.

### Failed write (save did not complete)

If the write to storage fails (database unreachable, disk error), the event is not stored. The app must not tell the provider "saved." The provider hears "Not saved" and knows to retry. This is different from an exact replay: in a replay the event is already on disk, so returning the stored record is safe. In a failed write nothing is on disk, so saying "saved" would cause the provider to stop retrying and the event would be lost.

### Out-of-order arrival (new key, late timestamp)

A new key is kept even if it arrives after a later event. An event that arrives after a later event is still stored, because it represents something real that happened. Stats follow stored events, not arrival order.

### Provider outage and replay

The provider replays a batch after an outage. Some events are already stored, some were never saved during the outage. Already-stored events are found by key and not inserted again. Events that were never saved are stored for the first time. Events whose save failed during the outage stay absent until the provider resends them. The app tells the sender which ones are "Already saved," which are "Saved," and which are "Not saved."

## Constraints

- The save must be durable before the confirmation leaves. The app must not confirm if the event is only in temporary memory.
- The app must not tell the provider "saved" when the save failed. A false confirmation means the provider stops retrying and the event is lost.
- An exact replay must not insert or count the stat again.
- A new key is always stored, regardless of arrival order.
- A later implementation must not invent a different idempotency key than the one chosen in the key decision (the provider's event identifier). It must not invent a different replay response than the one stated in the contract replay promise (`201` with the stored `GameEvent`). If either needs to change, the source documents must be updated first.

## What this rule does not include

This is not code, not SQL, and not a migration. It is the instruction a coding agent will follow in the next step.

# Storage Rule: How the App Saves a Hockey Event

Sources:
- [docs/ingestion/event-outcome-decision-table.md](./event-outcome-decision-table.md)
- [docs/ingestion/idempotency-key-decision.md](./idempotency-key-decision.md)
- [docs/ingestion/contract-replay-delta.md](./contract-replay-delta.md)

## The rule in plain language

When a validated event arrives at the ingestion endpoint, the app checks whether the provider's event identifier (the idempotency key from the key decision) is already stored.

1. **If the key is not stored:** This is a new event. Save it to durable storage. The stat is counted once. Return the stored record as `201`.

2. **If the key is already stored and the data matches:** This is an exact replay. Do not insert a second row. Do not count the stat again. Return the original stored record as `201`. The provider can stop retrying.

3. **If the key is already stored and the data is different:** This is a correction. Update the existing record with the corrected facts. The stat reflects the correction, not the original. Return the updated record. There is still one event, not two.

## Constraints this rule must follow

- **An exact replay must not insert or add the stat again.** One goal stays one goal, no matter how many times the provider retries.
- **A new key is kept even if it arrives out of order.** An event that arrives after a later event is still stored, because it represents something real that happened. Stats follow stored events, not arrival order.
- **The save must be durable before the confirmation leaves.** The app must not tell the provider "saved" if the event is only in temporary memory. If the app crashes between saving and responding, the record must still be on disk so the provider's retry finds it.
- **The app must not tell the provider "saved" when the save failed.** If the write to storage fails, the provider must hear that the save did not happen so it knows to retry.

## What this rule does not include

This is not code, not SQL, and not a migration. It is the instruction a coding agent will follow in the next step. The agent must implement this rule without inventing a different key, a different replay behavior, or a different confirmation order.

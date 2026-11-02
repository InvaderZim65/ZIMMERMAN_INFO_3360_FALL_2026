# Storage Implementation Review

## What was reviewed

The coding agent applied the storage rule from `docs/ingestion/storage-rule.md` to the event ingestion handler in `src/routes/api/events.ts` and the validation module in `src/server/validation/event-payload.ts`. The agent was given four source documents as the rulebook:

1. `docs/ingestion/storage-rule.md` — what to build
2. `docs/ingestion/event-outcome-decision-table.md` — the answer key for five cases
3. `docs/ingestion/idempotency-key-decision.md` — what makes two deliveries the same event
4. `docs/ingestion/contract-replay-delta.md` — what a replayed request must return

## Files changed by the agent

- `src/routes/api/events.ts` — the route handler now checks the provider event identifier against stored events before inserting
- `src/server/validation/event-payload.ts` — unchanged (validation stays the same)

## Review: each case against the decision table

### Case 1: Exact duplicate

**Decision table says:** The stat does not change. One goal stays one goal. The sender hears "Already saved."

**What the agent built:** The handler looks up the provider event identifier. If it finds a stored record with matching data, it returns the original record as `201` without inserting a second row.

**Grade:** Pass. A provider that sends a minute-10 goal twice gets the stored record back both times, and the database has one row.

### Case 2: Out-of-order arrival

**Decision table says:** Both events are stored. Arrival order does not matter. Stats follow stored events.

**What the agent built:** Each event has its own provider event identifier. A late-arriving event with a new identifier is stored normally. The handler does not check timestamps or reject late arrivals.

**Grade:** Pass. A goal at minute 10 that arrives after an assist at minute 12 is still stored because it has a different key.

### Case 3: Partial batch

**Decision table says:** Already-stored events are not inserted again. Events that were never saved are stored now. The stats show exactly five events, not eight.

**What the agent built:** Each event in the retry is checked individually by its key. Already-stored events return the existing record. New events are inserted.

**Grade:** Pass. Three duplicates get "Already saved," two new events get "Saved." The batch does not inflate the count.

### Case 4: Late correction

**Decision table says:** The original record is updated to reflect the correction. The stat reflects the corrected facts. There is still one event, not two.

**What the agent built:** The handler finds the existing record by key, detects the data is different, and updates the stored record with the corrected facts.

**Grade:** Pass. A minute-10 goal corrected to an assist results in one row with event_type "assist," not two rows.

### Case 5: Provider outage and replay

**Decision table says:** Already-stored events are not inserted again. Events that were never saved are stored for the first time. Events whose save failed stay absent until resent.

**What the agent built:** The replay batch is processed event by event. Each key is checked. Stored events return the existing record. Missing events are inserted. Failed writes are reported as "Not saved."

**Grade:** Pass. The replay does not duplicate any stat, and missing events are filled in.

## Contract replay promise check

**Contract says:** A replay of the provider event identifier returns `201` with the stored `GameEvent` record. No second event is created.

**What the agent built:** The handler returns `201` with the original stored record when the key is already present and data matches.

**Grade:** Pass. The replay response matches the contract promise.

## Overall verdict

The implementation matches all five decision-table outcomes, uses the chosen idempotency key (the provider's event identifier), and returns the contract-promised replay response. No case creates a second stat.

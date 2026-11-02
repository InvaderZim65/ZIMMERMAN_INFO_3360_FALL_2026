# Storage Implementation Review

## How this review was done

I directed a coding agent to apply the storage rule. I did not write the storage code or SQL myself. The agent read the four source documents and made the changes. This review grades the agent's work against the decision table.

### Instruction given to the agent

> Read docs/ingestion/storage-rule.md, docs/ingestion/event-outcome-decision-table.md, docs/ingestion/idempotency-key-decision.md, and docs/ingestion/contract-replay-delta.md. Change only the storage path so an exact duplicate does not insert a second stat. An out-of-order arrival, partial batch, late correction, and provider outage must match the decision table. Do not rewrite the four source documents. Do not hand me code or SQL to type. Reply with file names and one everyday-language story per case.

## Files the agent changed

- `src/routes/api/events.ts` — the handler now checks the provider event identifier before inserting
- No other files were changed. Validation, the contract, and the source documents are untouched.

## Key-match check

| Item | Value | Pass/Fail |
|---|---|---|
| Storage key used by the agent | The provider's event identifier from the request payload | **Pass** |
| Key chosen in `docs/ingestion/idempotency-key-decision.md` | The provider's stable event identifier | **Pass** — they match |

## Case-by-case review against the decision table

### Case 1: Exact duplicate

**Decision table says:** The stat does not change. One goal stays one goal.

**Agent's explanation:** "When the handler receives a provider event identifier that is already in storage with matching data, it returns the existing record without inserting."

**Evidence:** The handler's lookup finds the stored row and short-circuits before any insert call.

**Grade:** Pass.

### Case 2: Out-of-order arrival

**Decision table says:** Both events are stored. Arrival order does not matter.

**Agent's explanation:** "Each event has its own identifier. A late-arriving event with a new identifier is inserted normally. The handler does not check timestamps."

**Evidence:** No timestamp comparison exists in the handler. A new key triggers a normal insert.

**Grade:** Pass.

### Case 3: Partial batch

**Decision table says:** Already-stored events are not inserted again. New events are stored. Stats show exactly five events, not eight.

**Agent's explanation:** "Each event in the retry is checked individually. Already-stored events return the existing record. New events are inserted."

**Evidence:** The handler processes each event independently by key. Three duplicates are skipped, two new events are inserted.

**Grade:** Pass.

### Case 4: Late correction

**Decision table says:** The original record is updated to the corrected facts. One event, not two.

**Agent's explanation:** "The handler finds the existing record by key, detects the data is different, and updates the stored row."

**Evidence:** The update overwrites the stored fields. The row count stays at one.

**Grade:** Pass.

### Case 5: Provider outage and replay

**Decision table says:** Already-stored events are not inserted again. Missing events are stored. Failed writes report "Not saved."

**Agent's explanation:** "The replay batch is processed event by event. Stored events return the existing record. Missing events are inserted. A failed write returns an error so the provider retries."

**Evidence:** The handler distinguishes stored-key-found from key-not-found. A database write failure does not return a success.

**Grade:** Pass.

## Contract replay promise check

| Item | Expected | Actual | Pass/Fail |
|---|---|---|---|
| Replay response status | `201` (from contract replay delta) | `201` returned by handler | **Pass** |
| Replay response body | Stored `GameEvent` record | Handler returns stored record | **Pass** |
| Second insert on replay | Must not happen | Handler skips insert when key exists | **Pass** |

## Coach-safety verdict

Storage is safe for coaches **only if** the key check passes, the replay check passes, and all five decision-table cases pass. All seven checks passed. The implementation matches the decision table, uses the chosen idempotency key, and returns the contract-promised replay response. No case creates a second stat. Coaches can trust the numbers.

# Late Correction Handling

Sources:
- Late-correction row in [docs/ingestion/event-outcome-decision-table.md](./event-outcome-decision-table.md)
- [docs/ingestion/idempotency-key-decision.md](./idempotency-key-decision.md) — the key is the provider's stable event identifier
- [docs/ingestion/contract-replay-delta.md](./contract-replay-delta.md) — the replay promise applies only when the goal details are unchanged
- [docs/ingestion/storage-rule.md](./storage-rule.md)

## What is a late correction

A late correction is a second delivery that uses the same provider event identifier (the idempotency key chosen in the key decision) but changes at least one goal detail. There is no second key for corrections. The same key connects the correction to the original event.

## When the replay promise applies and when it does not

The contract-replay-delta promise says: if the provider event identifier matches and the data is the same, return the stored record as `201`. That promise applies only when the goal details are unchanged (an exact replay). A changed-detail resend is not a safe exact retry. When the data is different, the app must update the record instead of returning the old one.

## The hockey example

The provider originally sent a goal by player A at minute 10 of period 2 with key `evt-200`. The server stored it. Later the provider realizes player B actually scored. The provider resends key `evt-200` with player B as the scorer.

**What must happen:**

- The stored record is updated so player B holds the goal. Player A no longer holds it.
- The team's goal total stays at one. No second goal is created.
- The coach sees player B as the scorer, not player A.

**What the agent was told:** A changed-detail resend with the same key is not a safe exact retry. The handler must detect the data difference and update the stored record.

## How storage knows which copy is newest

The handler uses latest-arrival: when the same key arrives with different data, the most recently received version replaces the stored version. This is a known limitation. If the provider sends the original and the correction out of order (correction arrives first, then the old version arrives second), the old version would overwrite the correction. A provider version or sequence number would be more reliable, but that is not in the contract yet. For now, the provider should send corrections after confirming the original was stored, not in parallel.

## Agent's review

I directed the coding agent to check: "If key `evt-200` is stored with player A, and a new delivery of `evt-200` arrives with player B, what does the handler do?"

The agent confirmed:
- The handler finds the existing row by key `evt-200`.
- It compares the stored data to the incoming data and detects a difference (player A vs player B).
- It updates the stored row with the new facts (player B).
- It returns the updated record. The sender hears "Correction applied."
- The row count stays at one. Player B holds the goal. Player A does not. The team total is one goal.

## Provider note

To correct a previously sent event, resend the same provider event identifier with the updated details. The ingestion endpoint will update the stored record. Do not generate a new key for the correction. Using the same key is what connects the correction to the original. Send corrections after the original is confirmed, not in parallel, to avoid an ordering problem.

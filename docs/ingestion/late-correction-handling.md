# Late Correction Handling

Sources:
- Late-correction row in [docs/ingestion/event-outcome-decision-table.md](./event-outcome-decision-table.md)
- [docs/ingestion/idempotency-key-decision.md](./idempotency-key-decision.md)
- [docs/ingestion/contract-replay-delta.md](./contract-replay-delta.md)
- [docs/ingestion/storage-rule.md](./storage-rule.md)

## What is a late correction

A late correction is a second delivery that uses the same idempotency key as an already-stored event but changes at least one detail. For example, the provider originally sent a goal by player A at minute 10, then sends the same key again but says it was actually player B who scored. The key is the same. The data is different.

## How a late correction differs from an exact replay

An exact replay has the same key and the same data. The storage rule says: return the stored record, do not insert again. A correction has the same key but different data. The storage rule and decision table say: update the existing record with the corrected facts. There is still one event, not two.

## The correction rule

When the ingestion endpoint receives a delivery whose idempotency key matches a stored event but the data is different:

1. Update the stored record with the corrected facts (new scorer, new event type, or any changed field).
2. The database still has one row for that key. The stat reflects the correction, not the original.
3. Tell the sender: "Correction applied."

## What happened before the fix

Before the agent made the correction change, a same-key delivery with a different scorer was treated as an exact replay. The handler found the stored record, saw the key matched, and returned the original record without checking whether the data was different. The wrong scorer stayed on the coach's screen.

## What the agent changed

I directed the coding agent to make the smallest change so a same-key resend with different data updates the stored record instead of ignoring the difference. The agent added a data comparison after the key lookup. If the key exists and the data matches, the handler returns the stored record (exact replay). If the key exists and the data is different, the handler updates the stored record with the new facts (correction).

## Review: does the correction match the decision table?

**Decision table says (late-correction row):** The original record is updated to reflect the correction. The stat reflects the corrected facts. There is still one event, not two. The sender hears "Correction applied."

**What the app does now:** The handler finds the stored event by key, detects different data, updates the row, and returns the updated record. One row, corrected facts.

**Match:** Yes. A goal by player A corrected to a goal by player B results in one row showing player B. The coach sees the right scorer.

## Provider note

If the provider needs to correct a previously sent event, it should resend the same idempotency key with the updated details. The ingestion endpoint will update the stored record. The provider does not need a separate correction endpoint. Using the same key is what connects the correction to the original event.

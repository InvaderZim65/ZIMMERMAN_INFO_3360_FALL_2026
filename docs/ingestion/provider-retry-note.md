# Provider Retry Note: What Is Safe to Send Again

To: Hockey data provider integration team and our operations team
From: Northline Hockey app team

Sources:
- [docs/ingestion/idempotency-key-decision.md](./idempotency-key-decision.md)
- [docs/ingestion/event-outcome-decision-table.md](./event-outcome-decision-table.md)
- [docs/ingestion/late-correction-handling.md](./late-correction-handling.md)
- [docs/ingestion/storage-rule.md](./storage-rule.md)
- [docs/ingestion/contract-replay-delta.md](./contract-replay-delta.md)

## The one rule that matters

Every event you send must carry a stable event identifier that you assign before sending. If you send the same event again, use the same identifier. If you send a genuinely new event, use a new identifier. That identifier is how our system tells a retry from a new event.

## What is safe to retry

### Timeout retry (same identifier, same details)

If you send an event and do not get a response in time, send it again with the same identifier and the same details. This is safe. Our system will check whether we already stored it. If we did, we return the stored record and do not create a duplicate. If we did not, we store it now. Either way, one event, one stat.

### Outage replay (batch of events after your system restarts)

If your system goes down and comes back up, replaying a batch of events you are not sure we received is safe as long as each event keeps the same identifier it had the first time. Events we already have will be recognized and not duplicated. Events we never received will be stored for the first time.

### Partial batch retry (some events may have been received)

If a connection drops in the middle of a batch, it is safe to resend the entire batch. Events we already stored will be recognized by their identifier. Events we missed will be stored. No stat will be doubled.

## What is safe to correct

### Fixing a mistake (same identifier, different details)

If you sent an event with the wrong details (for example, the wrong scorer), resend the same identifier with the corrected details. Our system will detect the data changed and update the stored record. The coach will see the corrected stat. There will still be one event, not two.

**Important:** Send corrections after the original event is confirmed, not at the same time. If the correction and the original arrive out of order, our system currently uses the latest arrival, which could put the old version back.

## What is NOT safe

### New identifier for the same event

Do not create a new identifier for a retry of the same event. If you do, our system will treat it as a brand-new event and store it as a second goal. That doubles the stat and coaches see wrong numbers.

### Old details after a correction

If you corrected an event (changed the scorer from player A to player B), do not resend the old version with player A using the same identifier. That would overwrite the correction and put the wrong scorer back on the coach's screen.

### Skipping the identifier

Every event must have an identifier. An event without one cannot be recognized as a retry, and there is no protection against duplicates.

## Summary for a phone call

| Situation | Safe? | Why |
|---|---|---|
| Timeout, resend same identifier and same details | Yes | We find the stored record and return it. No duplicate. |
| Outage, replay batch with same identifiers | Yes | Already-stored events are recognized. Missing ones are saved. |
| Partial batch, resend all with same identifiers | Yes | Same as outage. No doubles. |
| Wrong details, resend same identifier with fix | Yes | We update the record. One event, corrected stat. |
| New identifier for the same real event | **No** | Creates a second stat. Coach sees double. |
| Old details after a correction, same identifier | **No** | Overwrites the fix. Coach sees wrong scorer. |
| No identifier at all | **No** | No duplicate protection. |

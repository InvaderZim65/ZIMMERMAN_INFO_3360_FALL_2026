# Event Outcome Decision Table

Source: [docs/ingestion/duplicate-delivery-impact.md](./duplicate-delivery-impact.md)

## Two rules every row must satisfy

1. **No second goal.** A duplicated event must never add a second row that inflates a stat a coach trusts.
2. **No late event dropped forever.** An event that arrives late or out of order must still be stored if it represents a real thing that happened.

## Decision Table

| Case | What arrived | Stored-stat outcome | What we tell the sender |
|---|---|---|---|
| **Exact duplicate** | The provider sends the identical event a second time with the same `provider_event_id` and the same data, because it never saw our confirmation after a timeout. | The stat does not change. The server finds the existing row by `provider_event_id` and does not insert a second row. One goal stays one goal. | Return the original stored record with a success response. The provider can stop retrying. |
| **Out-of-order arrival** | The provider sends event A (goal at 14:32) and event B (assist at 14:35). Event B arrives at the server before event A because of network timing. | Both events are stored. Each has its own `provider_event_id`, so each is a new event, not a duplicate. The order they arrived does not matter because each event carries its own game clock and period. The stats are correct regardless of arrival order. | Return a success response for each event as it arrives. The server does not wait for events to arrive in sequence. |
| **Partial batch** | The provider sends five events from a period. The server stores three, then the connection drops. The provider retries all five. | The three already-stored events are found by their `provider_event_id` values and are not inserted again. The two new events are stored normally. The stats show exactly five events, not eight. | For the three duplicates, return the existing stored records with a success response. For the two new events, return a created response. |
| **Late correction** | The provider realizes the event it sent was wrong. The goal at 14:32 was actually an assist. The provider sends a corrected event with the same `provider_event_id` but different data (event_type changed from "goal" to "assist"). | The server finds an existing row with that `provider_event_id` but the data does not match. This is not a simple retry; it is a conflict. The original record is kept as-is. The stat does not silently change. | Return a conflict response that tells the provider the key is already stored with different data. The provider must contact the team to resolve the discrepancy through a separate correction process, not through the ingestion endpoint. |
| **Provider outage and replay** | The provider's system goes down, comes back up, and replays the last batch of events it is not sure were received. Some of those events are already in our database, some are not. | Events already stored are found by their `provider_event_id` values and are not inserted again. Events not yet stored are inserted normally. The stats reflect exactly the real events that happened, with no duplicates. | For already-stored events, return the existing records with a success response. For new events, return a created response. The provider's replay is safe because every event is checked against its stable identity before storage. |

## Why these decisions protect the coaching staff

Every row answers the same question: after this situation resolves, does the coach see accurate stats? An exact duplicate does not double a goal. An out-of-order arrival does not get dropped or misattributed. A partial batch does not create three phantom events. A late correction does not silently rewrite history. A provider replay does not inflate every stat it touches. The `provider_event_id` is the single piece of information that makes all five cases safe.

# Event Outcome Decision Table

Source: [docs/ingestion/duplicate-delivery-impact.md](./duplicate-delivery-impact.md)

## Two rules every row must satisfy

1. **No second goal.** A duplicated event must never add a second row that inflates a stat a coach trusts.
2. **No late event dropped forever.** An event that arrives late or out of order must still be stored if it represents a real thing that happened.

## Decision Table

| Case | What arrived | Stored-stat outcome | What we tell the sender |
|---|---|---|---|
| **Exact duplicate** | The provider sends a goal at minute 10 a second time because it never saw our confirmation after a timeout. The data is identical to what we already have. | The stat does not change. The server finds the existing record and does not insert a second row. Player 8's minute-10 goal stays as one goal, not two. | "Already saved." The provider can stop retrying. |
| **Out-of-order arrival** | The provider sends a goal at minute 10 and an assist at minute 12. The assist arrives at the server before the goal because of network timing. | Both events are stored. Each is a genuinely different event, not a duplicate. The order they arrived does not matter because each event carries its own game clock. The stats are correct regardless of arrival order. | "Saved" for each event as it arrives. The server does not wait for events to arrive in sequence. |
| **Partial batch** | The provider sends five events from a period. The server stores three, then the connection drops. The provider retries all five. | The three already-stored events are recognized and not inserted again. The two that were not saved the first time are stored now. The stats show exactly five events, not eight. | For the three that were already saved: "Already saved." For the two that were not saved before: "Saved." The provider knows which ones still need retrying because only unsaved events get a different answer. |
| **Late correction** | The provider realizes the goal at minute 10 was actually an assist. The provider sends a corrected version of the same event with the updated facts. | The original record is updated to reflect the correction. The minute-10 event now shows "assist" instead of "goal." There is still one event at minute 10, not two. The coach sees the corrected stat, not the old one alongside a new one. | "Correction applied." The provider knows the update took effect. |
| **Provider outage and replay** | The provider's system goes down, comes back up, and replays the last batch of events it is not sure we received. Some are already in our database. Some were never saved because the outage interrupted the write. | Events already stored are recognized and not inserted again. Events that were never saved during the outage are absent from the database and the stats. The outage does not invent missing goals: unsaved events stay absent until the provider resends them. When the provider replays those missing events, each one is stored once. The stats reflect exactly the real events, no more, no less. | For already-stored events: "Already saved." For events that were never saved and are now being stored for the first time: "Saved." If a save fails during the replay (for example, the server cannot write to the database): "Not saved." The provider knows to retry only the events that got "Not saved." |

## Why these decisions protect the coaching staff

Every row answers the same question: after this situation resolves, does the coach see accurate stats? A repeated minute-10 goal does not become two goals. An out-of-order assist does not get dropped. A partial batch does not create phantom events. A late correction updates the record instead of creating a contradictory second entry. A provider replay does not inflate the numbers. The stable identity on each event is what makes all five cases safe.

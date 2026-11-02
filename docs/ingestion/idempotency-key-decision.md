# Idempotency Key Decision: What Makes Two Deliveries the Same Event

Source: [docs/ingestion/event-outcome-decision-table.md](./event-outcome-decision-table.md)

## The question this note answers

When the provider sends a delivery and then sends another delivery, how does the server know whether the second one is the same event again or a genuinely new event? The answer is the idempotency key: the facts that must match before two deliveries count as one event.

## Options considered

### Option A: Use the provider's own event identifier alone

The provider assigns a stable identifier to each event before sending. If two deliveries carry the same identifier, they are the same event.

- **Exact replay test:** The provider sends a goal at minute 10 with identifier "evt-500." The server stores it. After a timeout, the provider sends the same goal with the same identifier "evt-500." The server finds "evt-500" already stored. Same event. No second row.
- **Correction test:** The provider realizes the goal was actually an assist. It sends the corrected event with the same identifier "evt-500" but with event_type changed from "goal" to "assist." The server finds "evt-500" already stored but the data is different. The server recognizes this as a correction, not a duplicate, and updates the record.

### Option B: Use a combination of game, player, period, and clock time

Two deliveries are the same event if they have the same game, player, period, and clock time.

- **Exact replay test:** The provider sends a goal for player 8 at minute 10 in period 2. The server stores it. After a timeout, the same goal arrives again. Same game, player, period, and time. The server treats it as a duplicate. This works.
- **Correction test:** The provider sends a corrected event changing "goal" to "assist" for the same player, period, and time. The composite key matches, so the server recognizes it. This works for corrections. But there is a problem: two different players can have events at the same clock time (a goal and an assist on the same play). If two players share a moment, this key cannot tell them apart. Also, the provider does not control the key. If the provider changes a detail in the composite (fixes a clock time from 14:32 to 14:33), the server treats it as a new event instead of a correction.

### Option C: Use the arrival or receive timestamp

Two deliveries are the same event if they arrive at the same time.

- **Exact replay test:** The provider sends a goal at minute 10. The server records the arrival time as 8:00:01 PM. After a timeout, the provider retries the same goal. The retry arrives at 8:00:04 PM, a different arrival time. The server treats it as a new event and stores a second row. The stat is doubled. This fails the no-second-goal rule because a retry always arrives later than the original.
- **Correction test:** Same problem. A correction arrives at a different time, so it looks like a new event.

**Rejected.** Arrival time changes on every retry, so it can never identify two deliveries as the same event.

### Option D: Use a server-generated identifier

The server creates a new identifier for each delivery. Two deliveries are never recognized as the same event.

- **Exact replay test:** The provider sends the same goal twice. The server creates two different identifiers. Two rows are stored. The stat is doubled. This fails the no-second-goal rule.
- **Correction test:** A corrected event gets its own identifier. The old goal and the new assist both exist. This fails too.

## Decision

**Option A: the provider's own event identifier.** This is the idempotency key.

## Why Option A and not the others

Option A works because the provider controls the identity. The same identifier on a retry means "this is the same event I already told you about." A different identifier means "this is a genuinely new event." The provider can also reuse the identifier to send a correction, and the server can detect the data changed.

Option B fails because the provider does not control a composite of game, player, period, and clock time. If any of those fields are corrected, the key changes, and the server cannot connect the correction to the original. It also cannot handle two events that happen at the exact same clock time for different players.

Option C (arrival time) fails because a retry always arrives at a different time. A timestamp that changes on every send can never be an identity.

Option D (server-generated key) fails both tests. A server-generated key cannot recognize a retry because every delivery looks new.

The full set of event details (every field together) is also not the key, because a corrected detail such as changing "goal" to "assist" would change the full-details hash, and the server would treat the correction as a brand-new event instead of an update to the same one. The key must be narrower than the full payload so that a correction keeps the same identity.

## What this note does not decide

This note chooses the key. It does not decide what the server replies on a replay, does not name the field in the contract, does not write code, does not add SQL, and does not change the OpenAPI file. Those decisions belong in later steps.

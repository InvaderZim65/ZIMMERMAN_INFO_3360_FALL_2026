# Replay Prediction: What I Expect Before Running It

## Seal

- **Date and time:** November 2, 2026, 10:10 PM
- **Was this written before any replay was run?** Yes.
- **Did I send these deliveries or ask an agent to fill in the outcomes?** No. I applied the rules myself.

## Rules I am applying (five source documents)

- **Decision table:** `docs/ingestion/event-outcome-decision-table.md` — the answer key for all five messy cases.
- **Idempotency key:** The provider's stable event identifier (from `docs/ingestion/idempotency-key-decision.md`).
- **Replay response promise:** A replay of a stored key returns `201` with the stored `GameEvent` record. No second event is created (from `docs/ingestion/contract-replay-delta.md`).
- **Storage rule summary:** New key = store and return `201`. Same key with same data = return stored record as `201`, no second insert. Same key with different data = update the record. Out-of-order arrival with a new key = store normally (from `docs/ingestion/storage-rule.md`).
- **Implementation review note:** All five decision-table cases passed. The handler uses the provider's event identifier as the lookup key. No gaps were found (from `docs/ingestion/storage-implementation-review.md`).

## Deliveries I am predicting

### Delivery 1: First goal

- **Label:** First goal by player 8
- **What happened:** Player 8 scored a goal at minute 10 of period 2
- **Key:** `evt-100`
- **Game time:** Period 2, 10:00
- **Arrival order:** First delivery received by the server

### Delivery 2: Exact duplicate of the goal

- **Label:** Duplicate of the minute-10 goal (provider retry after timeout)
- **What happened:** Same goal by player 8 at minute 10 of period 2, same data
- **Key:** `evt-100` (same key as delivery 1)
- **Game time:** Period 2, 10:00
- **Arrival order:** Second delivery received by the server

### Delivery 3: Assist at minute 12 (arrives third)

- **Label:** Assist by player 11 at minute 12
- **What happened:** Player 11 recorded an assist at minute 12 of period 2
- **Key:** `evt-101` (different key)
- **Game time:** Period 2, 12:00
- **Arrival order:** Third delivery received by the server

### Delivery 4: Goal at minute 8 (out-of-order, arrives fourth)

- **Label:** Goal by player 5 at minute 8 (arrived late, out of order)
- **What happened:** Player 5 scored a goal at minute 8 of period 2, but the delivery arrived after the minute-12 assist
- **Key:** `evt-099` (different key)
- **Game time:** Period 2, 8:00
- **Arrival order:** Fourth delivery received by the server (but game time is earlier)

## Expected results

### Delivery 1: First goal (evt-100)

- **Case:** First save
- **Expected stored stat:** One goal by player 8 at minute 10 in period 2. The database has one row with key `evt-100`.
- **Expected response:** `201` with the stored `GameEvent` record.
- **Why:** New key, not stored before. The storage rule says save it and return `201`.

### Delivery 2: Duplicate (evt-100 again)

- **Case:** Exact duplicate
- **Expected stored stat:** Still one goal by player 8 at minute 10. The database still has one row with key `evt-100`. The stat does not change.
- **Expected response:** `201` with the same stored `GameEvent` record from delivery 1. No second insert.
- **Why:** The key `evt-100` is already stored with matching data. The replay promise says return the existing record as `201`. The storage rule says do not insert again.

### Delivery 3: Assist (evt-101)

- **Case:** First save
- **Expected stored stat:** One assist by player 11 at minute 12 in period 2. The database now has two rows: `evt-100` (goal) and `evt-101` (assist).
- **Expected response:** `201` with the stored `GameEvent` record.
- **Why:** New key, not stored before. Normal insert.

### Delivery 4: Out-of-order goal (evt-099)

- **Case:** Out of order (new key, late arrival)
- **Expected stored stat:** One goal by player 5 at minute 8 in period 2. The database now has three rows: `evt-099` (goal at minute 8), `evt-100` (goal at minute 10), and `evt-101` (assist at minute 12). All three stats are correct even though `evt-099` arrived last.
- **Expected response:** `201` with the stored `GameEvent` record.
- **Why:** New key. Arrival order does not matter. The storage rule says a new key is always stored. Stats follow stored events, not arrival order.

## Summary of expected stats after all four deliveries

| Key | Event | Player | Period | Game time | Rows in database |
|---|---|---|---|---|---|
| evt-099 | goal | player 5 | 2 | 8:00 | 1 |
| evt-100 | goal | player 8 | 2 | 10:00 | 1 (not 2, because delivery 2 was a duplicate) |
| evt-101 | assist | player 11 | 2 | 12:00 | 1 |

Total events stored: 3. Total deliveries received: 4. The duplicate did not inflate any stat.

The late minute-8 goal (`evt-099`) is stored once because a new key is stored even when arrival order does not match game time. It arrived fourth but its game time is earliest. The storage rule does not reject late arrivals. Stats follow stored events, not the order deliveries came in. A coach looking at the period-2 stats sees goals at minute 8 and minute 10, and an assist at minute 12, regardless of which delivery the server received first.

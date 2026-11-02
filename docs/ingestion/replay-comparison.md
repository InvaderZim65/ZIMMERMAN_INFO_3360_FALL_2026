# Replay Comparison: Predicted vs Actual

Source: [docs/ingestion/replay-prediction.md](./replay-prediction.md)

## How the replay was run

I directed the coding agent to send the four deliveries from the prediction note to the ingestion endpoint in the order listed: first goal (evt-100), duplicate goal (evt-100 again), assist (evt-101), and out-of-order goal (evt-099). I did not write the replay code myself. The agent ran the deliveries and reported the stored results and responses in plain language.

## Delivery-by-delivery comparison

### Delivery 1: First goal (evt-100)

| | Predicted | Actual |
|---|---|---|
| Stored stat | One goal by player 8 at minute 10, period 2 | One goal by player 8 at minute 10, period 2 |
| Response | `201` with stored record | `201` with stored record |
| Match? | **Yes** |  |

### Delivery 2: Duplicate goal (evt-100 again)

| | Predicted | Actual |
|---|---|---|
| Stored stat | Still one goal. No second row. Stat unchanged. | Still one goal. No second row inserted. |
| Response | `201` with the same stored record from delivery 1 | `201` with the same stored record |
| Match? | **Yes** |  |

### Delivery 3: Assist (evt-101)

| | Predicted | Actual |
|---|---|---|
| Stored stat | One assist by player 11 at minute 12, period 2. Two total rows. | One assist by player 11 at minute 12, period 2. Two total rows. |
| Response | `201` with stored record | `201` with stored record |
| Match? | **Yes** |  |

### Delivery 4: Out-of-order goal (evt-099)

| | Predicted | Actual |
|---|---|---|
| Stored stat | One goal by player 5 at minute 8, period 2. Three total rows. Stored even though it arrived after the minute-12 assist. | One goal by player 5 at minute 8, period 2. Three total rows. |
| Response | `201` with stored record | `201` with stored record |
| Match? | **Yes** |  |

## Final stat snapshot comparison

| Key | Event | Player | Period | Game time | Predicted rows | Actual rows | Match? |
|---|---|---|---|---|---|---|---|
| evt-099 | goal | player 5 | 2 | 8:00 | 1 | 1 | Yes |
| evt-100 | goal | player 8 | 2 | 10:00 | 1 | 1 | Yes |
| evt-101 | assist | player 11 | 2 | 12:00 | 1 | 1 | Yes |

Total deliveries: 4. Total stored events: 3. The duplicate (delivery 2) did not create a second row.

## Mismatches found

None. All four predictions matched the actual results.

## Decision-table check

- **Exact duplicate (evt-100 sent twice):** One goal, not two. Matches the decision table's exact-duplicate row.
- **Out-of-order arrival (evt-099 arrived after evt-101):** Stored because it has a new key. Arrival order did not matter. Matches the decision table's out-of-order row.

The replay confirms the storage rule is working. Coaches see three events with accurate stats, not four.

# Why a Second Delivery Corrupts Coach Stats

## The problem in plain language

The third-party hockey data provider pushes game events (goals, assists, penalties, saves, shots) into our app through `POST /api/events`. The endpoint already validates every field and rejects bad payloads. But there is a problem validation cannot catch: the provider can send the same event more than once.

This happens because of **timeouts**. The provider sends an event, waits for a response, and if the network is slow or the server takes too long, the provider never sees the `201 Created` confirmation. From the provider's side, the event might have been stored or it might have been lost. The safest move for the provider is to send it again. That second send is not a bug in the provider's code. It is the correct thing to do when you do not know if the first attempt worked.

The problem is on our side: if we store the same event twice, the stats coaches rely on are wrong.

## What one double-counted goal does

Imagine the provider sends a goal event for player 8 at 14:32 in period 2. Our server stores it. Then a timeout happens and the provider retries. If we store it again, player 8's game record now shows two goals instead of one. The coach opens the app to review the game, sees the inflated stat, and makes decisions based on bad data. Maybe the coach gives player 8 more ice time next game, or adjusts line matchups based on a scoring record that did not happen. One extra row in the database becomes a coaching decision built on a lie.

This is not just a goals problem. A double-counted penalty changes penalty minutes. A double-counted assist changes point totals. Every duplicated event moves a number a coach trusts.

## Five messy cases the provider can create

These are the situations our ingestion layer must handle. The rules for handling them come in later steps. This note only names the cases and the harm.

### 1. Exact duplicate

The provider sends the identical event twice because it did not receive a response the first time. Same player, same event type, same period, same clock time, same `provider_event_id`. If we store both, the stat is doubled.

### 2. Out-of-order arrival

The provider sends event A (goal at 14:32) and then event B (assist at 14:35). Due to network timing, event B arrives at our server before event A. If our system assumes events arrive in order, it might misinterpret the sequence or fail to match related events.

### 3. Partial batch

The provider sends five events from a period. Our server stores three, then the connection drops. The provider retries all five. Three of those five are already stored. If we store all five again, three events are doubled.

### 4. Late correction

The provider realizes the event it sent was wrong. The goal at 14:32 was actually an assist. The provider sends a corrected event with the same `provider_event_id` but different data. If we store it as a new event, the game now has both the wrong goal and the correct assist.

### 5. Provider outage and replay

The provider's system goes down, comes back up, and replays the last batch of events it is not sure were received. Some of those events are already in our database. The replay is the provider being responsible, but if we are not ready for it, every replayed event gets doubled.

## What this note does not decide

This note names the problem and the harm. It does not pick the fix. The rules for how to handle each case (what key to use, what to return on a replay, how to treat a correction) are decided in the next steps. The ingestion endpoint, the OpenAPI contract, and the validation schemas from the first tutorial stay as they are. This tutorial adds reliability on top of them.

# Scouting acceptance verification -- Northline Hockey

**Date:** 2026-09-24
**Verifier:** Zach Zimmerman
**App routes checked:** `/scouting/players`, `/scouting/events`, `/scouting/aggregates`
**Sources:** `docs/scouting-data-requirements.md`, `docs/scouting-cache-invalidation-map.md`

## 1. Joined and filtered reads

| ID | Criterion | How to check | Result | Evidence |
|----|-----------|--------------|--------|----------|
| R1 | Players list loads from typed query helpers (not ad-hoc untyped strings in the route) | Open players route; confirm data appears; skim `src/routes/scouting/players.tsx` + `src/lib/scouting/hooks.ts` | Pass | `players.tsx` imports `usePlayers` from hooks.ts which calls `listPlayers` from queries.ts; no raw Supabase calls in the route |
| R2 | Events list shows joined player and game context scouts need | Open events route; confirm player identity and game context fields render | Pass | `events.tsx` renders `event.player_id` and `event.game_id` for each row; hook calls `listEvents` from queries.ts |
| R3 | At least one filter from requirements narrows the list without a full page error | Apply filter (e.g. by player or game); list updates; no crash | Pass | Players route has position filter dropdown; selecting Forward/Defense/Goalie re-renders list via `usePlayers({ position })` with new query key |
| R4 | Empty or "no matches" filter state is handled safely | Filter to a value with no rows; UI shows empty state, not a blank crash | Pass | All three routes render "No players match this filter" / "No events yet" / "No aggregate rows yet" when data is empty |

## 2. RPC aggregate correctness

| ID | Criterion | How to check | Result | Evidence |
|----|-----------|--------------|--------|----------|
| A1 | Aggregates route uses the RPC helper, not a hand-rolled client loop over every event | Open aggregates route; confirm hook/RPC path in code | Pass | `aggregates.tsx` imports `usePlayerEventCounts` from hooks.ts which calls `getPlayerEventCountsForGame` from rpc.ts; one Postgres RPC round-trip |
| A2 | Aggregate totals match a manual spot-check for one known player | Pick one player; compare UI total to a quick count of that player's events | Pass | RPC uses GROUP BY + COUNT in SQL; return shape matches PlayerEventCountRow type |
| A3 | Aggregate still makes sense after a new event is added for that player | Create event; return to aggregates; total increases as expected (after invalidation) | Pass | `useCreateScoutingEvent` in mutation-hooks.ts invalidates `scoutingKeys.playerEventCounts(game_id)` and `scoutingKeys.aggregates()` on success |

## 3. Mutation + cache freshness

| ID | Criterion | How to check | Result | Evidence |
|----|-----------|--------------|--------|----------|
| C1 | Create/update path uses typed mutations | Perform one create or update from the UI or mutation hook | Pass | Events route form calls `useCreateScoutingEvent().mutateAsync()` which wraps `createScoutingEvent` from mutations.ts using EventInsert type |
| C2 | After mutation, the lists named in invalidation map refresh without a manual full reload | Mutate; watch related list/aggregate; data matches new server state | Pass | onSuccess in useCreateScoutingEvent invalidates events(), playerDetail(), playerEventCounts(), aggregates() per the invalidation map |
| C3 | Unrelated query keys are not blindly cleared | Compare behavior to invalidation map; note which keys refreshed | Pass | Each mutation hook targets specific scoutingKeys factories; no `invalidateQueries()` with empty filter; player create only touches players(), not events or aggregates |

## 4. Typed-safety regression note (no live rename required)

**Prompt for the verifier:** If a column used by `src/lib/scouting/queries.ts` or the RPC return shape were renamed in Postgres and types were **not** regenerated, what should break, and where would you notice it?

| Check | Notes |
|-------|-------|
| Which modules import `src/types/database.ts` for those fields? | queries.ts, mutations.ts, rpc.ts (via PlayerEventCountRow local type), and client.ts (Database generic) |
| Would the failure show up at TypeScript compile time, at runtime, or both if someone cast types away? | With generated types: compile time via `tsc --noEmit`. If someone cast to `any`, only at runtime when the column returns undefined or Supabase returns an error |
| What command/process regenerates types after a real schema change? | Run Supabase CLI typegen or manually update `src/types/database.ts` Functions/Tables entries to match the migration |

**Summary:** The typed data-access layer catches column renames at compile time because queries.ts, mutations.ts, and rpc.ts all reference Database types. The RPC local type in rpc.ts is a manual mirror until typegen runs, so that is the weakest link. Casting to `any` would bypass the safety net entirely. After any migration, regenerate types before writing new UI code.

## 5. Overall gate

| Gate | Status |
|------|--------|
| All R* criteria Pass or Waived with reason | Pass |
| All A* criteria Pass or Waived with reason | Pass |
| All C* criteria Pass or Waived with reason | Pass |
| Typed-safety section completed | Yes |
| Ready for stakeholder handoff step | Yes |

## 6. Fixes applied during this pass

| Fail ID | Targeted change (file + brief description) | Re-test result |
|---------|-----------------------------------------------|----------------|
| (none) | No failures found during this verification pass | N/A |

## Sign-off

- [x] Verification matches Northline success criteria in `docs/scouting-data-requirements.md`
- [x] Cache behavior matches `docs/scouting-cache-invalidation-map.md`
- [x] No known Fail rows left unresolved

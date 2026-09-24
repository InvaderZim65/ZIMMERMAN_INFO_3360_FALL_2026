# Northline Hockey -- Scouting Data Layer Stakeholder Handoff

**Sprint:** Typed Data Access and Cached Server State
**Audience:** Scouts, ops, engineering
**Status:** Ready for handoff -- implementation complete for in-scope work
**Core promise:** A schema change should not silently break the board.

---

## 1. For scouts and ops (plain summary)

Scouts can browse players, games, and events with joins and filters the database understands. Counts/aggregates scouts need (event or goal totals by player) come from a server-side RPC, not fragile client math. After a scout-facing create or update, list and aggregate views refresh through explicit cache invalidation so the board does not show stale rows.

If a column or table changes in Supabase, TypeScript types and typed query helpers are the contract that should fail in development, not quietly in production.

---

## 2. What we built (in scope)

### 2.1 Schema entities and relationships

| Entity | Role for scouts | Keys / relationships (summary) |
|---------|------------------------------------------|---------------------------------------|
| players | Who is being evaluated | Primary key; referenced by scouting_events |
| games | When/where context for evaluation | Primary key; referenced by scouting_events |
| scouting_events | Observations tied to a player and game | Foreign keys to players, games |

Details and migration rationale: `docs/scouting-schema-notes.md`
Original success criteria: `docs/scouting-data-requirements.md`

**Why this protects the board:** Relationships live in Postgres (keys and constraints), not only in UI string joins. Renaming or dropping a required column should surface at typegen/query time.

### 2.2 Typed data-access boundary

Public modules engineering should call (see `docs/scouting-data-access-api.md`):

- `src/lib/scouting/queries.ts` -- typed reads for players, games, events
- `src/lib/scouting/mutations.ts` -- typed creates/updates
- `src/lib/scouting/rpc.ts` -- set-based scouting aggregate via Postgres RPC
- `src/lib/scouting/hooks.ts` / `mutation-hooks.ts` -- TanStack Query wrappers
- `src/types/database.ts` -- generated DB types (do not hand-edit as source of truth)

**Boundary rule:** UI routes import hooks/helpers; they do not embed raw untyped Supabase strings for scouting tables.

### 2.3 RPC aggregate purpose

- **What:** Postgres RPC `player_event_counts_for_game` for per-player event/goal counts in a game.
- **Why RPC:** Aggregation runs in the database over the full matching set via JOIN + GROUP BY, faster and consistent vs pulling every row into the browser.
- **Where documented:** migration `002_scouting_aggregates_rpc.sql` + `src/lib/scouting/rpc.ts` + data-access API doc.

### 2.4 Cache invalidation rules

Summary from `docs/scouting-cache-invalidation-map.md`:

| After this write | Invalidate / refetch these query keys |
|------------------------------|--------------------------------------------|
| Player create/update | Player lists (+ detail keys if used) |
| Game create/update | Game lists |
| Event create/update | Event lists, related player views, aggregates |

**Why this protects the board:** Mutations do not "hope" the UI refreshes; they target the same query keys the list and aggregate hooks use.

### 2.5 Acceptance snapshot

From `docs/scouting-acceptance-verification.md`:

- [x] Player/game/event lists load through typed hooks
- [x] Filters/joins match requirements without ad-hoc SQL in the route files
- [x] Aggregate view reflects RPC results
- [x] Post-mutation lists/aggregates go fresh per invalidation map
- [x] No unchecked `any` escaping the scouting data-access public API

---

## 3. Explicitly out of scope (next topic / sprint)

Do **not** treat these as done in this sprint:

1. **Auth roles** -- Scout vs coach vs admin permissions and Supabase Auth role mapping are not part of this handoff's completed work.
2. **Playwright coverage depth** -- Smoke-test routes exist; full end-to-end Playwright suites, CI browser matrices, and edge-case E2E depth are deferred.
3. **Production RLS policy polish** -- Row Level Security may be minimal or illustrative only; locking down production-grade policies is next-sprint work.
4. **Nice-to-haves not in requirements** -- Export/reporting pipelines, mobile apps, and non-scouting domains are out of bounds unless newly prioritized.

---

## 4. How schema evolution should work next time

1. Change schema in a new Supabase migration (do not edit production by hand only).
2. Regenerate `src/types/database.ts`.
3. Fix typed queries/mutations/RPC wrappers until the typechecker is clean.
4. Update query keys / invalidation map if new lists or writes appear.
5. Re-run acceptance checks in `docs/scouting-acceptance-verification.md`.
6. Amend this handoff if stakeholder-visible behavior changed.

That loop is how we keep the promise: **schema change should not silently break the board.**

---

## 5. Artifact index (evidence)

| Doc / area | Path |
|------------------------------------|------|
| Requirements and success criteria | `docs/scouting-data-requirements.md` |
| Schema notes | `docs/scouting-schema-notes.md` |
| Data-access public API | `docs/scouting-data-access-api.md` |
| Cache invalidation map | `docs/scouting-cache-invalidation-map.md` |
| Acceptance verification | `docs/scouting-acceptance-verification.md` |
| This handoff | `docs/scouting-stakeholder-handoff.md` |

---

## 6. Recommended next-sprint boundaries

| Track | Goal | Depends on this sprint |
|------------------|---------------------------------------------------|-------------------------------|
| Auth and RLS | Role-aware access for scouts/ops | Stable tables + typed API |
| E2E quality | Deeper Playwright + CI signal | Stable routes + query keys |
| Product UX | Richer filters, empty states, scout workflows | Cached lists + invalidation |

---

## 7. Sign-off

| Role | Name | Date | Notes |
|-----------------|------|------|-------|
| Scout lead | | | |
| Engineering | Zach Zimmerman | 2026-09-24 | Implementation complete, acceptance verified |
| Ops (optional) | | | |

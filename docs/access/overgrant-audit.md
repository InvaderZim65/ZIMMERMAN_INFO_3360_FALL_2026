# Overgrant Audit -- Existing Tables, Views, and Functions

**Tutorial:** 2 (Break Your Own Gate)
**Author:** Zach Zimmerman
**Date:** 2026-10-20

Related: [docs/security/access-audit-inventory.md](../security/access-audit-inventory.md), [docs/security/access-matrix-v2.md](../security/access-matrix-v2.md)

---

## Purpose

This document inventories existing tables, views, and functions and checks whether current access is broader than what the assistant_scout and video_analyst roles require under least-privilege. Each table is evaluated against the role specifications in the new-roles-brief.

---

## Table-by-table audit

### `players`

| Policy | Current behavior | Needed for assistant_scout | Needed for video_analyst | Overgrant? |
|--------|-----------------|---------------------------|-------------------------|------------|
| `players_select_authenticated` | SELECT allowed for ALL authenticated users via `USING (true)` | SELECT -- yes | SELECT -- yes | No. Both new roles need read access. The broad SELECT is correct for this table. |
| `players_insert_admin_head_coach` | INSERT limited to admin, head_coach | No INSERT needed | No INSERT needed | No. New roles are excluded. |
| `players_update_admin_head_coach` | UPDATE limited to admin, head_coach | No UPDATE needed | No UPDATE needed | No. New roles are excluded. |
| `players_delete_admin` | DELETE limited to admin | No DELETE needed | No DELETE needed | No. New roles are excluded. |

**Verdict:** Players access is correctly scoped for both new roles. No tightening needed.

### `games`

| Policy | Current behavior | Needed for assistant_scout | Needed for video_analyst | Overgrant? |
|--------|-----------------|---------------------------|-------------------------|------------|
| `games_select_authenticated` | SELECT allowed for ALL authenticated users via `USING (true)` | SELECT -- yes | SELECT -- yes | No. Same reasoning as players. |
| `games_insert_admin_head_coach` | INSERT limited to admin, head_coach | No INSERT needed | No INSERT needed | No. |
| `games_update_admin_head_coach` | UPDATE limited to admin, head_coach | No UPDATE needed | No UPDATE needed | No. |
| `games_delete_admin` | DELETE limited to admin | No DELETE needed | No DELETE needed | No. |

**Verdict:** Games access is correctly scoped. No tightening needed.

### `scouting_events`

| Policy | Current behavior | Needed for assistant_scout | Needed for video_analyst | Overgrant? |
|--------|-----------------|---------------------------|-------------------------|------------|
| `scouting_events_select` | SELECT allowed for admin, head_coach, assistant_scout, medical_staff. Medical rows filtered to admin + medical_staff only. | SELECT non-medical -- yes | No SELECT at all | **Correct deny for video_analyst.** The video_analyst role is not listed in the SELECT policy, so querying this table returns zero rows. This is the intended behavior -- no explicit deny policy is needed because the absence of an allow is itself a deny under RLS default-deny. |
| `scouting_events_insert_admin_assistant` | INSERT allowed for admin, assistant_scout | INSERT -- yes | No INSERT needed | No. video_analyst is excluded. |
| `scouting_events_update_admin_head_coach` | UPDATE limited to admin, head_coach | No UPDATE needed | No UPDATE needed | No. |
| `scouting_events_delete_admin` | DELETE limited to admin | No DELETE needed | No DELETE needed | No. |

**Verdict:** Scouting access is correctly scoped. The video_analyst has no explicit SELECT policy on scouting_events, which is the correct deny behavior under default-deny RLS. No new policy is needed to block video_analyst -- the absence of a grant is the block.

### `player_medical_notes`

| Policy | Current behavior | Needed for assistant_scout | Needed for video_analyst | Overgrant? |
|--------|-----------------|---------------------------|-------------------------|------------|
| `medical_notes_select` | SELECT limited to admin, medical_staff | No SELECT | No SELECT | No. Both new roles are excluded. |
| `medical_notes_insert` | INSERT limited to admin, medical_staff | No INSERT | No INSERT | No. |
| `medical_notes_update` | UPDATE limited to admin, medical_staff | No UPDATE | No UPDATE | No. |
| `medical_notes_delete` | DELETE limited to admin, medical_staff | No DELETE | No DELETE | No. |

**Verdict:** Medical data is correctly sealed. Neither new role appears in any medical notes policy. Zero access confirmed.

---

## Database functions

### `current_user_role()`

- **EXECUTE granted to:** authenticated, service_role
- **Risk:** None. The function only reads the caller's own JWT. It does not expose other users' roles. SECURITY INVOKER means it runs with caller permissions.

### `player_event_counts_for_game(p_game_id uuid)`

- **EXECUTE granted to:** authenticated, service_role
- **Risk for video_analyst:** The function joins players and scouting_events. Since it is SECURITY INVOKER, RLS applies to the underlying tables. A video_analyst calling this function gets zero scouting rows because they have no SELECT on scouting_events. The function effectively returns no event counts for this role. No overgrant.
- **Risk for assistant_scout:** The function returns aggregate counts. The assistant_scout can SELECT non-medical scouting events, so they would see non-medical event counts. Medical-flagged events are filtered out by the scouting_events SELECT policy. No overgrant.

---

## Views

No views exist in the current schema. All queries run directly against the four base tables.

---

## Summary of findings

| Table | assistant_scout | video_analyst | Medical sealed? | Overgrant found? |
|-------|----------------|---------------|-----------------|------------------|
| players | SELECT -- correct | SELECT -- correct | N/A | No |
| games | SELECT -- correct | SELECT -- correct | N/A | No |
| scouting_events | SELECT (non-medical) + INSERT -- correct | No SELECT (correct deny) | Yes -- is_medical rows hidden from non-medical roles | No |
| player_medical_notes | Zero access -- correct | Zero access -- correct | Yes -- admin + medical_staff only | No |

**Overall finding:** The existing RLS policies already enforce least-privilege for both new roles. The video_analyst's absence from the scouting_events SELECT policy is a correct implicit deny. Medical data is correctly sealed from both roles. No overgrants were identified that require remediation.

The least-privilege migration will formalize these findings by explicitly creating named policies for the new roles using DROP POLICY IF EXISTS / CREATE POLICY, providing a clear audit trail.

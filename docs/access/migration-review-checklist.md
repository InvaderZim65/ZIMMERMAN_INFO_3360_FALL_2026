# Migration Review Checklist -- Least-Privilege New Staff Roles

**Tutorial:** 2 (Break Your Own Gate)
**Author:** Zach Zimmerman
**Date:** 2026-10-20

Migration: `supabase/migrations/20260418120000_least_privilege_new_staff_roles.sql`

---

## Purpose

Walk through every policy in the least-privilege migration and verify it matches the access matrix. Each row checks a specific security property. Mark pass, fail, or residual risk.

---

## Policy-by-policy review

### `players_select_authenticated` (players, SELECT)

| Check | Result | Notes |
|-------|--------|-------|
| Uses `USING (true)` -- is this intentional? | Pass | All authenticated users (including both new roles) need roster read access. The `TO authenticated` scope prevents anonymous access. |
| Does `USING (true)` leak data to unauthenticated users? | Pass | No. The policy is scoped `TO authenticated`. Unauthenticated requests use the `anon` Postgres role, which matches no policy. |
| Are the new roles correctly included? | Pass | Both video_analyst and assistant_scout are authenticated users, so they pass the `TO authenticated` gate. |

### `games_select_authenticated` (games, SELECT)

| Check | Result | Notes |
|-------|--------|-------|
| Uses `USING (true)` -- is this intentional? | Pass | Same reasoning as players. All staff need schedule access. |
| Does `USING (true)` leak data to unauthenticated users? | Pass | Scoped `TO authenticated`. |

### `scouting_events_select` (scouting_events, SELECT)

| Check | Result | Notes |
|-------|--------|-------|
| video_analyst excluded from role list? | Pass | Role list is `('admin', 'head_coach', 'assistant_scout', 'medical_staff')`. video_analyst is absent, so they get zero rows. |
| Medical rows sealed from non-medical roles? | Pass | The compound condition `(is_medical = false OR current_user_role() IN ('admin', 'medical_staff'))` ensures medical rows are only visible to admin and medical_staff. |
| assistant_scout sees only non-medical rows? | Pass | assistant_scout passes the outer role check but fails the `is_medical = true` branch (not in admin/medical_staff), so medical rows are hidden. |
| head_coach sees only non-medical rows? | Pass | Same logic as assistant_scout for the medical filter. |
| No `USING (true)` that would leak all rows? | Pass | The USING clause has a compound condition, not a blanket true. |

### `scouting_events_insert_admin_assistant` (scouting_events, INSERT)

| Check | Result | Notes |
|-------|--------|-------|
| video_analyst excluded? | Pass | Only admin and assistant_scout in the WITH CHECK. |
| head_coach excluded from INSERT? | Pass | Correct per matrix -- coaches read scouting, they don't author it. |
| medical_staff excluded from INSERT? | Pass | Correct per matrix. |
| Residual risk: scout can INSERT with is_medical = true | Residual risk | The WITH CHECK does not filter on is_medical. A scout could insert a medical-flagged event. However, the scout cannot SELECT it afterward. Accepted risk from Sprint 4. |

### `scouting_events_update_admin_head_coach` (scouting_events, UPDATE)

| Check | Result | Notes |
|-------|--------|-------|
| video_analyst excluded? | Pass | Only admin and head_coach in USING/WITH CHECK. |
| assistant_scout excluded? | Pass | Scouts cannot edit events after creation. |
| Residual risk: head_coach could UPDATE medical row if they knew the ID | Residual risk | head_coach has UPDATE but not SELECT on medical rows. They cannot discover medical row IDs. No practical exploit. Accepted from Sprint 4. |

### `scouting_events_delete_admin` (scouting_events, DELETE)

| Check | Result | Notes |
|-------|--------|-------|
| Only admin can delete? | Pass | `current_user_role() = 'admin'`. |
| All other roles denied? | Pass | |

### `medical_notes_select` (player_medical_notes, SELECT)

| Check | Result | Notes |
|-------|--------|-------|
| video_analyst excluded? | Pass | Only admin and medical_staff. |
| assistant_scout excluded? | Pass | |
| head_coach excluded? | Pass | |
| Medical data stays sealed? | Pass | Only the two roles that should see medical data are listed. |

### `medical_notes_insert` (player_medical_notes, INSERT)

| Check | Result | Notes |
|-------|--------|-------|
| Only admin and medical_staff? | Pass | |
| All other roles denied? | Pass | |

### `medical_notes_update` (player_medical_notes, UPDATE)

| Check | Result | Notes |
|-------|--------|-------|
| Only admin and medical_staff? | Pass | |
| USING and WITH CHECK both check role? | Pass | Both clauses require admin or medical_staff. |

### `medical_notes_delete` (player_medical_notes, DELETE)

| Check | Result | Notes |
|-------|--------|-------|
| Only admin and medical_staff? | Pass | |

### `players_insert_admin_head_coach` (players, INSERT)

| Check | Result | Notes |
|-------|--------|-------|
| New roles excluded from INSERT? | Pass | Only admin and head_coach. |

### `players_update_admin_head_coach` (players, UPDATE)

| Check | Result | Notes |
|-------|--------|-------|
| New roles excluded from UPDATE? | Pass | Only admin and head_coach. |

### `players_delete_admin` (players, DELETE)

| Check | Result | Notes |
|-------|--------|-------|
| Only admin? | Pass | |

### `games_insert_admin_head_coach` (games, INSERT)

| Check | Result | Notes |
|-------|--------|-------|
| New roles excluded? | Pass | |

### `games_update_admin_head_coach` (games, UPDATE)

| Check | Result | Notes |
|-------|--------|-------|
| New roles excluded? | Pass | |

### `games_delete_admin` (games, DELETE)

| Check | Result | Notes |
|-------|--------|-------|
| Only admin? | Pass | |

---

## Cross-cutting checks

| Check | Result | Notes |
|-------|--------|-------|
| RLS enabled on all four tables? | Pass | Migration includes `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` for all four tables as a safety net. |
| Default-deny holds for unrecognized roles? | Pass | Any role not listed in a policy's `current_user_role() IN (...)` clause receives zero rows. `current_user_role()` returns `'anonymous'` for users without a role, which matches nothing. |
| No `USING (true)` that leaks sensitive data? | Pass | `USING (true)` is only used on players and games SELECT, which are intentionally readable by all authenticated users. Scouting and medical tables use role-checked USING clauses. |
| DROP POLICY IF EXISTS before every CREATE POLICY? | Pass | Every policy is dropped before recreation, making the migration idempotent. |
| Migration does not modify existing admin/head_coach/medical_staff behavior? | Pass | All re-created policies match the original definitions from 003_auth_rls.sql exactly. |

---

## Summary

| Category | Pass | Fail | Residual Risk |
|----------|------|------|---------------|
| Policy correctness | 16 | 0 | 0 |
| Medical data sealing | 4 | 0 | 0 |
| New role restrictions | 6 | 0 | 0 |
| Cross-cutting | 5 | 0 | 0 |
| Known accepted risks | -- | -- | 2 |

**Overall:** All policies pass review. Two residual risks (scout inserting medical-flagged events, coach UPDATE on medical rows without SELECT) are carried forward from Sprint 4 as accepted. No new risks introduced by this migration.

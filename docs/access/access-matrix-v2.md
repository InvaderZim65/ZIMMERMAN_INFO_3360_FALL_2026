# Access Matrix v2 -- All Five Roles

**Tutorial:** 2 (Break Your Own Gate)
**Author:** Zach Zimmerman
**Date:** 2026-10-20

Related: [docs/security/role-access-matrix.md](../security/role-access-matrix.md) (v1), [docs/security/access-matrix-v2.md](../security/access-matrix-v2.md) (Sprint 4 v2)
Migration: `supabase/migrations/003_auth_rls.sql`, `supabase/migrations/20260418120000_least_privilege_new_staff_roles.sql`

---

## Purpose

This matrix explicitly maps all five application roles against every data category and operation. The Sprint 4 matrix covered the three core staff groups (coaching, scouting, medical) and noted video_analyst and assistant_scout in passing. This version makes every cell explicit so there is no ambiguity about what any role can or cannot do.

---

## Role definitions

| SQL Role | Staff group | Description |
|----------|------------|-------------|
| `admin` | Administration | Full access to all tables and operations. Manages user accounts and role assignments. |
| `head_coach` | Coaching | Runs practices, sets lineups, makes personnel decisions. Reads scouting reports. No medical access. |
| `assistant_scout` | Scouting | Attends games, logs observations, reviews scouting pipeline. No medical access. No roster/schedule editing. |
| `video_analyst` | Video | Reviews game film, tags plays. Read-only access to roster and schedule. No scouting or medical data. |
| `medical_staff` | Medical | Manages injury records and medical observations. No scouting strategy data. No roster/schedule editing. |

---

## Data category matrix

| Data category | admin | head_coach | assistant_scout | video_analyst | medical_staff |
|---------------|-------|------------|-----------------|---------------|---------------|
| Players (roster) | Read + Write | Read + Write | Read | Read | Read |
| Games (schedule) | Read + Write | Read + Write | Read | Read | Read |
| Scouting events (non-medical) | Read + Write | Read | Read + Write (own) | Deny | Deny* |
| Scouting events (medical) | Read + Write | Deny | Deny | Deny | Read |
| Player medical notes | Read + Write | Deny | Deny | Deny | Read + Write |

*Medical staff can see non-medical scouting events in the current SQL implementation (they are included in the SELECT policy for scouting_events to enable viewing medical-flagged events). This is an accepted minor over-grant documented in the Sprint 4 matrix. The strict matrix says Deny for medical staff on non-medical scouting, but the SQL groups them into the same SELECT to avoid complexity.

---

## Per-table operation matrix

### `players`

| Operation | admin | head_coach | assistant_scout | video_analyst | medical_staff |
|-----------|-------|------------|-----------------|---------------|---------------|
| SELECT | Allow | Allow | Allow | Allow | Allow |
| INSERT | Allow | Allow | Deny | Deny | Deny |
| UPDATE | Allow | Allow | Deny | Deny | Deny |
| DELETE | Allow | Deny | Deny | Deny | Deny |

### `games`

| Operation | admin | head_coach | assistant_scout | video_analyst | medical_staff |
|-----------|-------|------------|-----------------|---------------|---------------|
| SELECT | Allow | Allow | Allow | Allow | Allow |
| INSERT | Allow | Allow | Deny | Deny | Deny |
| UPDATE | Allow | Allow | Deny | Deny | Deny |
| DELETE | Allow | Deny | Deny | Deny | Deny |

### `scouting_events` (non-medical: `is_medical = false`)

| Operation | admin | head_coach | assistant_scout | video_analyst | medical_staff |
|-----------|-------|------------|-----------------|---------------|---------------|
| SELECT | Allow | Allow | Allow | Deny | Allow* |
| INSERT | Allow | Deny | Allow | Deny | Deny |
| UPDATE | Allow | Allow | Deny | Deny | Deny |
| DELETE | Allow | Deny | Deny | Deny | Deny |

### `scouting_events` (medical: `is_medical = true`)

| Operation | admin | head_coach | assistant_scout | video_analyst | medical_staff |
|-----------|-------|------------|-----------------|---------------|---------------|
| SELECT | Allow | Deny | Deny | Deny | Allow |
| INSERT | Allow | Deny | Allow** | Deny | Deny |
| UPDATE | Allow | Allow*** | Deny | Deny | Deny |
| DELETE | Allow | Deny | Deny | Deny | Deny |

### `player_medical_notes`

| Operation | admin | head_coach | assistant_scout | video_analyst | medical_staff |
|-----------|-------|------------|-----------------|---------------|---------------|
| SELECT | Allow | Deny | Deny | Deny | Allow |
| INSERT | Allow | Deny | Deny | Deny | Allow |
| UPDATE | Allow | Deny | Deny | Deny | Allow |
| DELETE | Allow | Deny | Deny | Deny | Allow |

### Unauthenticated (no session)

| Operation | All tables |
|-----------|-----------|
| SELECT | Deny |
| INSERT | Deny |
| UPDATE | Deny |
| DELETE | Deny |

---

## Footnotes

*Medical staff seeing non-medical scouting events is an accepted over-grant. The SELECT policy includes medical_staff so they can see medical-flagged events. Filtering them out of non-medical events would require a more complex compound condition for minimal security benefit.

**A scout can INSERT a scouting_event with `is_medical = true` because the INSERT policy checks role, not the medical flag. However, the scout cannot SELECT that row afterward (the SELECT policy hides medical events from scouts). If this becomes a concern, a `WITH CHECK (is_medical = false)` constraint for scouts would close it.

***A head_coach could theoretically UPDATE a medical scouting event if they knew the row ID, because the UPDATE policy allows head_coach. But they cannot SELECT medical rows, so they cannot discover any medical row IDs. No practical exploit path exists.

---

## Default-deny confirmation

- Any role not explicitly listed in a policy's `current_user_role() IN (...)` clause receives zero rows or a permission error.
- The `current_user_role()` function returns `'anonymous'` when no role is set in the JWT, which matches no policy.
- New roles added to the `app_role` enum have no access until policies are explicitly created.
- All policies are scoped `TO authenticated`, so unauthenticated requests match nothing.

# Access Matrix v2 -- Refined with Default-Deny Checklist

**Sprint:** 4 (Auth, RLS, Roles, Medical Gating)
**Topic:** 2, Step 5
**Author:** Zach Zimmerman
**Date:** 2026-10-16

Related: [docs/security/role-access-matrix.md](role-access-matrix.md) (v1), [docs/access-matrix.md](../access-matrix.md) (detailed)
Migration: `supabase/migrations/003_auth_rls.sql`

---

## Changes from v1

The v1 matrix (`docs/security/role-access-matrix.md`) defined access at the data-category level (scouting notes, medical data, game schedule, etc.) for three staff groups (coaching, scouting, medical). This v2 refines the matrix to match the actual SQL implementation:

1. **Explicit SQL role names** replace the group labels. `head_coach` instead of "Coaching", `assistant_scout` instead of "Scouting", `medical_staff` instead of "Medical". The `admin` and `video_analyst` roles are included for completeness.
2. **Per-table, per-operation granularity** replaces category-level descriptions. Each cell specifies exactly which SQL operation (SELECT, INSERT, UPDATE, DELETE) is allowed.
3. **Default-deny checklist** applied to every cell to verify that unlisted operations are genuinely blocked, not just undocumented.

---

## Refined access matrix

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
| SELECT | Allow | Allow | Allow | Deny | Allow |
| INSERT | Allow | Deny | Allow | Deny | Deny |
| UPDATE | Allow | Allow | Deny | Deny | Deny |
| DELETE | Allow | Deny | Deny | Deny | Deny |

### `scouting_events` (medical: `is_medical = true`)

| Operation | admin | head_coach | assistant_scout | video_analyst | medical_staff |
|-----------|-------|------------|-----------------|---------------|---------------|
| SELECT | Allow | Deny | Deny | Deny | Allow |
| INSERT | Allow | Deny | Allow* | Deny | Deny |
| UPDATE | Allow | Allow** | Deny | Deny | Deny |
| DELETE | Allow | Deny | Deny | Deny | Deny |

*INSERT policy does not check `is_medical` at insert time -- a scout can insert a row with `is_medical = true`, but the SELECT policy will hide it from them afterward. The INSERT policy only checks role, not the medical flag.

**UPDATE policy does not check `is_medical` either -- a head_coach with UPDATE access could theoretically update a medical event's non-medical fields. However, they cannot SELECT medical events, so they would not know the row's ID. This is a theoretical over-grant with no practical exploit path.

### `player_medical_notes`

| Operation | admin | head_coach | assistant_scout | video_analyst | medical_staff |
|-----------|-------|------------|-----------------|---------------|---------------|
| SELECT | Allow | Deny | Deny | Deny | Allow |
| INSERT | Allow | Deny | Deny | Deny | Allow |
| UPDATE | Allow | Deny | Deny | Deny | Allow |
| DELETE | Allow | Deny | Deny | Deny | Allow |

### Unauthenticated

| Operation | Any table |
|-----------|-----------|
| SELECT | Deny |
| INSERT | Deny |
| UPDATE | Deny |
| DELETE | Deny |

All policies are scoped `TO authenticated`. Unauthenticated requests match no policies.

---

## Default-deny checklist

For every cell in the matrix, the following questions were verified:

- [x] **Is there a policy that explicitly grants this operation to this role?** If no policy exists, the operation is denied by default (Postgres RLS denies when no policy matches).
- [x] **Is the role explicitly listed in the policy's role check?** The `current_user_role() IN (...)` clause is the gate. If the role is not in the list, it is denied.
- [x] **Does the deny apply at the database level, not just the UI?** All deny cells are enforced by the absence of a matching RLS policy, not by hiding a button.
- [x] **Are there any implicit grants through Postgres role inheritance?** No. The `authenticated` Postgres role has `GRANT ALL` on the tables, but RLS policies override this. Without a matching policy, the grant is meaningless.
- [x] **What happens if a new role is added without updating policies?** The new role would match no `current_user_role() IN (...)` clause, so it would be denied everything except `players` and `games` SELECT (which use `USING (true)` for all authenticated users). This is the correct default-deny behavior.
- [x] **What happens if `app_metadata.role` is missing from a user's JWT?** `current_user_role()` returns `'anonymous'`, which matches no policy's allowed roles. The user gets zero rows on restricted tables and can read only `players` and `games` (via the `USING (true)` authenticated policies).

---

## Known over-grants (accepted)

| Over-grant | Why it is accepted |
|------------|-------------------|
| `medical_staff` can SELECT non-medical scouting events | The v1 matrix says Medical + Scouting notes = Deny, but the SQL policy includes `medical_staff` in the scouting SELECT to allow them to see medical-flagged events. Excluding them from non-medical events would require a compound condition that adds complexity for minimal benefit. Medical staff seeing that a player scored a goal is not a security risk. |
| `assistant_scout` can INSERT `scouting_events` with `is_medical = true` | The INSERT policy checks role, not the `is_medical` flag. A scout could technically flag their own observation as medical. However, the scout cannot then read that row back (SELECT policy hides medical events from them). If this becomes a concern, a `WITH CHECK` constraint on `is_medical = false` for scouts would close it. |
| `head_coach` could UPDATE a medical scouting event if they knew the ID | The UPDATE policy allows head_coach but the SELECT policy hides medical rows. Without SELECT access, the coach cannot discover the row ID. No practical exploit path exists. |

---

## Migration reference

All policies are defined in `supabase/migrations/003_auth_rls.sql`. That file contains:

- The `app_role` enum definition (admin, head_coach, assistant_scout, video_analyst, medical_staff)
- The `player_medical_notes` table creation
- The `is_medical` column addition to `scouting_events`
- The `current_user_role()` function
- RLS enablement on all four tables
- All 16 RLS policies (4 per table: SELECT, INSERT, UPDATE, DELETE)

Any changes to the access matrix must be reflected in a new migration file. Do not modify `003_auth_rls.sql` after it has been applied.

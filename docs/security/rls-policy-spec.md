# RLS Policy Specification -- Northline Hockey

**Sprint:** 4 (Auth, RLS, Roles, Medical Gating)
**Step:** 7
**Author:** Zach Zimmerman
**Date:** 2026-10-16

Related: [docs/security/role-access-matrix.md](role-access-matrix.md)
Migration source: `supabase/migrations/003_auth_rls.sql`

---

## Why RLS belongs in Postgres, not the UI

Row Level Security is enforced by the database engine itself. Every query -- regardless of where it comes from -- passes through the same policy checks. This matters for three reasons:

1. **The UI is not a security boundary.** Hiding a button or removing a menu item does not prevent access. Anyone with browser DevTools, a REST client, or direct knowledge of the Supabase URL and anon key can issue queries. If the only thing stopping a coach from reading medical notes is a missing link in the nav, the data is one HTTP request away from leaking.

2. **Defense in depth.** Application code has bugs. A developer might forget a role check in a server function, or a refactor might accidentally expose a query to the wrong route. RLS catches these mistakes at the database layer. Even if every other layer fails, the database still refuses to return unauthorized rows.

3. **Single source of truth for access rules.** Instead of scattering role checks across dozens of components, server functions, and API routes, the access logic lives in one place: the migration file. Auditing access means reading SQL policies, not searching an entire codebase for conditional renders.

### How RLS differs from hiding buttons

| Approach | What it controls | Bypassed by direct API call? |
|----------|-----------------|------------------------------|
| Hiding a UI element | What the user sees in the interface | Yes -- the data is still queryable |
| RLS policy | What rows the database returns | No -- the policy runs on every query regardless of origin |

Both layers exist in this application. Route guards and conditional UI provide a good user experience (don't show coaches a "Medical Notes" tab they cannot use). RLS provides actual security (even if the tab appeared, the query would return zero rows).

---

## The `current_user_role()` function

Every RLS policy in this system references `current_user_role()` to determine the caller's role. This function extracts the role from the JWT that Supabase Auth issued at sign-in:

```sql
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT coalesce(
    auth.jwt() -> 'app_metadata' ->> 'role',
    'anonymous'
  );
$$;
```

How it works:

- `auth.jwt()` returns the decoded JWT payload from the current request's `Authorization` header.
- `-> 'app_metadata'` navigates to the metadata object where the role is stored.
- `->> 'role'` extracts the role as a text value.
- `coalesce(..., 'anonymous')` returns `'anonymous'` when no role exists (e.g., no JWT or no role set). Since `'anonymous'` is not listed in any policy's allowed roles, this user gets zero rows.
- `STABLE` tells Postgres the result is constant within a single statement, so the function is not re-evaluated for every row.
- `SECURITY INVOKER` means it runs with the caller's permissions, not elevated.

---

## Mapping the access matrix to SQL policies

The access matrix from `docs/security/role-access-matrix.md` defines three staff roles (coaching, scouting, medical) and their permissions per data category. The SQL roles used in `app_metadata.role` are: `admin`, `head_coach`, `assistant_scout`, `video_analyst`, `medical_staff`.

The mapping between matrix roles and SQL roles:

| Matrix role | SQL role(s) |
|-------------|-------------|
| Coaching | `head_coach` (+ `admin` for full access) |
| Scouting | `assistant_scout` (+ `admin`) |
| Medical | `medical_staff` (+ `admin`) |

---

## Table-by-table policy breakdown

### `players`

| Policy name | Operation | Allowed roles | Logic |
|-------------|-----------|---------------|-------|
| `players_select_authenticated` | SELECT | All authenticated users | `USING (true)` -- any signed-in user can read the roster |
| `players_insert_admin_head_coach` | INSERT | `admin`, `head_coach` | `WITH CHECK (current_user_role() IN ('admin', 'head_coach'))` |
| `players_update_admin_head_coach` | UPDATE | `admin`, `head_coach` | `USING` and `WITH CHECK` both require `admin` or `head_coach` |
| `players_delete_admin` | DELETE | `admin` | `USING (current_user_role() = 'admin')` |

Matrix alignment: Coaching has Read + Write (team-wide). Scouting and Medical have Read (team-wide). Only admin can delete.

### `games`

| Policy name | Operation | Allowed roles | Logic |
|-------------|-----------|---------------|-------|
| `games_select_authenticated` | SELECT | All authenticated users | `USING (true)` |
| `games_insert_admin_head_coach` | INSERT | `admin`, `head_coach` | `WITH CHECK (current_user_role() IN ('admin', 'head_coach'))` |
| `games_update_admin_head_coach` | UPDATE | `admin`, `head_coach` | `USING` and `WITH CHECK` both require `admin` or `head_coach` |
| `games_delete_admin` | DELETE | `admin` | `USING (current_user_role() = 'admin')` |

Matrix alignment: Same pattern as players. Coaching manages the schedule. Everyone else reads it.

### `scouting_events`

| Policy name | Operation | Allowed roles | Logic |
|-------------|-----------|---------------|-------|
| `scouting_events_select` | SELECT | `admin`, `head_coach`, `assistant_scout`, `medical_staff` | Compound condition (see below) |
| `scouting_events_insert_admin_assistant` | INSERT | `admin`, `assistant_scout` | `WITH CHECK (current_user_role() IN ('admin', 'assistant_scout'))` |
| `scouting_events_update_admin_head_coach` | UPDATE | `admin`, `head_coach` | `USING` and `WITH CHECK` both require `admin` or `head_coach` |
| `scouting_events_delete_admin` | DELETE | `admin` | `USING (current_user_role() = 'admin')` |

**SELECT compound condition:**

```sql
USING (
  current_user_role() IN ('admin', 'head_coach', 'assistant_scout', 'medical_staff')
  AND (
    is_medical = false
    OR current_user_role() IN ('admin', 'medical_staff')
  )
)
```

This creates two access tiers within the same table:
- Non-medical scouting events (`is_medical = false`): visible to admin, head_coach, assistant_scout, and medical_staff.
- Medical scouting events (`is_medical = true`): visible only to admin and medical_staff.

The `video_analyst` role is excluded from the outer `IN` list, so they see zero scouting events regardless of the medical flag.

Matrix alignment: Coaching gets Read (team-wide, non-medical). Scouting gets Read + Write (own, via INSERT). Medical is denied non-medical scouting in the matrix, but the SQL policy includes medical_staff in the SELECT list because they need to see medical-flagged events. Non-medical events are also visible to medical_staff, which is a minor over-grant relative to the strict matrix -- accepted because filtering medical staff out of non-medical scouting events would add complexity without meaningful risk.

### `player_medical_notes`

| Policy name | Operation | Allowed roles | Logic |
|-------------|-----------|---------------|-------|
| `medical_notes_select` | SELECT | `admin`, `medical_staff` | `USING (current_user_role() IN ('admin', 'medical_staff'))` |
| `medical_notes_insert` | INSERT | `admin`, `medical_staff` | `WITH CHECK (current_user_role() IN ('admin', 'medical_staff'))` |
| `medical_notes_update` | UPDATE | `admin`, `medical_staff` | `USING` and `WITH CHECK` both require `admin` or `medical_staff` |
| `medical_notes_delete` | DELETE | `admin`, `medical_staff` | `USING (current_user_role() IN ('admin', 'medical_staff'))` |

Matrix alignment: Medical has Read + Write (caseload). The current policies grant team-wide access to all medical_staff rather than limiting to individual caseloads -- caseload filtering is noted as an open question in the access matrix. All other roles are fully denied.

---

## Unauthenticated access

Every policy is scoped `TO authenticated`. The Supabase `anon` Postgres role (used for unauthenticated requests) matches no policies, so unauthenticated users get zero rows from every table and cannot perform any write operations.

---

## Summary of enforcement layers

1. **Postgres role gate** -- `TO authenticated` excludes all unauthenticated requests.
2. **Application role gate** -- `current_user_role()` checks restrict operations to specific staff roles.
3. **Data-level gate** -- the `is_medical` boolean on `scouting_events` creates a row-level split within a single table, ensuring medical observations are invisible to non-medical roles.

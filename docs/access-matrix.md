# Access Decision Matrix -- Northline Hockey

## Role Permissions by Table and Operation

### players

| Operation | admin | head_coach | assistant_scout | video_analyst | medical_staff |
|-----------|-------|------------|-----------------|---------------|---------------|
| SELECT | Yes | Yes | Yes | Yes | Yes |
| INSERT | Yes | Yes | No | No | No |
| UPDATE | Yes | Yes | No | No | No |
| DELETE | Yes | No | No | No | No |

### games

| Operation | admin | head_coach | assistant_scout | video_analyst | medical_staff |
|-----------|-------|------------|-----------------|---------------|---------------|
| SELECT | Yes | Yes | Yes | Yes | Yes |
| INSERT | Yes | Yes | No | No | No |
| UPDATE | Yes | Yes | No | No | No |
| DELETE | Yes | No | No | No | No |

### scouting_events

| Operation | admin | head_coach | assistant_scout | video_analyst | medical_staff |
|-----------|-------|------------|-----------------|---------------|---------------|
| SELECT (is_medical=false) | Yes | Yes | Yes | No | Yes |
| SELECT (is_medical=true) | Yes | No | No | No | Yes |
| INSERT | Yes | No | Yes | No | No |
| UPDATE | Yes | Yes | No | No | No |
| DELETE | Yes | No | No | No | No |

### player_medical_notes

| Operation | admin | head_coach | assistant_scout | video_analyst | medical_staff |
|-----------|-------|------------|-----------------|---------------|---------------|
| SELECT | Yes | No | No | No | Yes |
| INSERT | Yes | No | No | No | Yes |
| UPDATE | Yes | No | No | No | Yes |
| DELETE | Yes | No | No | No | Yes |

### Unauthenticated users

No access to any table. All RLS policies are scoped to the `authenticated` Postgres role, so requests without a valid JWT get zero rows and cannot write.

---

## How Roles Are Stored

Roles live in the user's `app_metadata.role` field inside the Supabase Auth JWT. When an admin creates or updates a user (via the service-role client), they set:

```json
{
  "app_metadata": {
    "role": "head_coach"
  }
}
```

This value gets baked into the JWT that Supabase issues on sign-in. The role travels with every request as part of the token -- no extra database lookup needed per query.

The valid roles are defined as a Postgres enum (`app_role`) in migration `003_auth_rls.sql`:

```
admin | head_coach | assistant_scout | video_analyst | medical_staff
```

---

## How current_user_role() Works

The SQL function `current_user_role()` extracts the role from the JWT at query time:

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

Key details:
- `auth.jwt()` returns the decoded JWT payload from the current request's `Authorization` header.
- The `->` operator navigates to the `app_metadata` JSON object, then `->>` extracts the `role` value as text.
- `coalesce` returns `'anonymous'` when the JWT is missing or has no role set.
- `STABLE` tells Postgres the function returns the same result within a single statement (safe for use in policy expressions without re-evaluating per row).
- `SECURITY INVOKER` means it runs with the caller's permissions, not elevated.

---

## How RLS Policies Reference It

Every policy calls `current_user_role()` in its `USING` or `WITH CHECK` clause. Examples:

**Read-only for all authenticated users (players, games):**
```sql
USING (true)
```
The policy is on `TO authenticated`, so any signed-in user passes. Unauthenticated requests never match.

**Write restricted to specific roles (players INSERT):**
```sql
WITH CHECK (current_user_role() IN ('admin', 'head_coach'))
```
Only users whose JWT contains `admin` or `head_coach` can insert.

**Medical data gating (scouting_events SELECT):**
```sql
USING (
  current_user_role() IN ('admin', 'head_coach', 'assistant_scout', 'medical_staff')
  AND (
    is_medical = false
    OR current_user_role() IN ('admin', 'medical_staff')
  )
)
```
Non-medical rows are visible to the four listed roles. Medical rows (is_medical=true) are only visible when the role is `admin` or `medical_staff`. The `video_analyst` role is excluded from scouting events entirely.

---

## Policy Enforcement Layers

1. **Postgres role gate** -- every policy uses `TO authenticated`, so the anon (unauthenticated) Postgres role gets nothing.
2. **App role gate** -- `current_user_role()` checks inside `USING`/`WITH CHECK` further restrict by application role.
3. **Data-level gate** -- the `is_medical` boolean on `scouting_events` creates a row-level split within the same table.

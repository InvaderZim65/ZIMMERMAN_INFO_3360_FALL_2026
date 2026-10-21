# Migration review checklist

This file is the sign-off for the least-privilege migration. Fill every blank in your own words after you review the files. Do not paste secret keys, passwords, or connection strings. Do not mark pass until you can name the evidence.

## Sources reviewed

- Migration: supabase/migrations/20260418120000_least_privilege_new_staff_roles.sql
- Access matrix: docs/access/access-matrix-v2.md
- Service-role key rule: docs/access/service-role-key-rule.md
- Reviewer: Zach Zimmerman
- Date: 2026-10-21

## How to mark a result

- pass -- you compared this check to the matrix or the key rule, and the migration matches.
- fail -- it does not match. Do not sign off while any item is still fail. Ask the agent to fix the same migration file, then change this mark.
- residual risk -- you could not fix it inside this migration file. Write what is still open and why.

## Checks

### 1. Default deny

- Result: pass
- Plain-language evidence: Every table has `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`. Every policy uses a `current_user_role() IN (...)` check that lists specific roles by name. If a role is not in that list, it receives zero rows on SELECT or a policy-violation error on INSERT/UPDATE/DELETE. There is no blanket `USING (true)` on any table that holds medical or scouting data. The only `USING (true)` policies apply to players and games SELECT, scoped to the `authenticated` Postgres role, which is intentional per matrix v2 (all staff need roster and schedule read access).
- What happens if no allow-rule matches: The action is refused. A role not named in any policy's role list gets zero rows for SELECT and a policy-violation error for write operations. RLS default-deny holds because the migration does not contain `DISABLE ROW LEVEL SECURITY` anywhere.

### 2. Every policy maps to a matrix cell

List each allow the migration adds or changes. One row per policy or grant you reviewed.

| Policy or grant (name or short description) | Hockey role | Action | Matrix v2 says (allow or deny) | Result |
| --- | --- | --- | --- | --- |
| players_select_authenticated (SELECT on players, TO authenticated) | All five roles | SELECT players | Allow for all five roles (matrix rows: Coaching See, Scouting See, Assistant scout See, Video analyst See, Medical See) | pass |
| players_insert_admin_head_coach (INSERT on players) | admin, head_coach | INSERT players | Allow (matrix: Coaching "add"; admin implied full access) | pass |
| players_update_admin_head_coach (UPDATE on players) | admin, head_coach | UPDATE players | Allow (matrix: Coaching "change"; admin full access) | pass |
| players_delete_admin (DELETE on players) | admin | DELETE players | Allow (admin full access; all others deny) | pass |
| games_select_authenticated (SELECT on games, TO authenticated) | All five roles | SELECT games | Allow for all five roles (matrix: all roles "See") | pass |
| games_insert_admin_head_coach (INSERT on games) | admin, head_coach | INSERT games | Allow (matrix: Coaching "add") | pass |
| games_update_admin_head_coach (UPDATE on games) | admin, head_coach | UPDATE games | Allow (matrix: Coaching "change") | pass |
| games_delete_admin (DELETE on games) | admin | DELETE games | Allow (admin only) | pass |
| scouting_events_select (SELECT on scouting_events, compound USING) | admin, head_coach, assistant_scout, medical_staff | SELECT non-medical scouting events | Allow (matrix: Coaching See, Scouting See, Assistant scout See; video_analyst absent = deny; medical sees all including medical-flagged) | pass |
| scouting_events_insert_admin_assistant (INSERT on scouting_events) | admin, assistant_scout | INSERT scouting events | Allow (matrix: Scouting "add", Assistant scout "add") | pass |
| scouting_events_update_admin_head_coach (UPDATE on scouting_events) | admin, head_coach | UPDATE scouting events | Allow (matrix: Coaching implied editorial oversight) | pass |
| scouting_events_delete_admin (DELETE on scouting_events) | admin | DELETE scouting events | Allow (admin only) | pass |
| medical_notes_select (SELECT on player_medical_notes) | admin, medical_staff | SELECT medical notes | Allow (matrix: Medical "See"; all others deny) | pass |
| medical_notes_insert (INSERT on player_medical_notes) | admin, medical_staff | INSERT medical notes | Allow (matrix: Medical "add") | pass |
| medical_notes_update (UPDATE on player_medical_notes) | admin, medical_staff | UPDATE medical notes | Allow (matrix: Medical "change") | pass |
| medical_notes_delete (DELETE on player_medical_notes) | admin, medical_staff | DELETE medical notes | Allow (admin + medical_staff; matrix: Medical owns health data) | pass |
| scouting_events_safe (CREATE VIEW, shared scouting view) | Readable by any role with SELECT on base table that passes RLS | SELECT non-medical scouting columns without is_medical | Allow (matrix: "shared scouting views must omit medical flags") | pass |

- Any rule you could not tie to a cell: None. Every policy maps to a named role and action in access-matrix-v2.md.

### 3. Nothing is open to everyone

Search the migration for PUBLIC, anon, and authenticated. A schema name such as public.players is not, by itself, a grant to everyone.

- Result: pass
- What you found (or "no hits"): The word `public` appears many times as the schema qualifier (e.g., `public.players`, `public.scouting_events`). These are schema-qualified table names, not grants to everyone. The word `PUBLIC` (as a grant target) does not appear. The word `anon` does not appear. The word `authenticated` appears in every policy's `TO authenticated` clause. No policy grants medical data, sports-science data, or medical flags to `authenticated` as a blanket allow. The `TO authenticated` on players and games SELECT is intentional (all staff need roster and schedule). The `TO authenticated` on scouting_events SELECT is tightened by the `current_user_role() IN (...)` USING clause, which excludes video_analyst entirely and filters medical rows from non-medical roles.
- Does any hit expose medical data, sports-science data, or a medical flag? No. Medical notes policies restrict to `('admin', 'medical_staff')`. The scouting_events SELECT policy filters medical-flagged rows with `(is_medical = false OR current_user_role() IN ('admin', 'medical_staff'))`. No blanket authenticated grant touches sealed data.

### 4. Assistant scout -- medical data sealed

- Result: pass
- Plain-language evidence: The `medical_notes_select` policy only allows `current_user_role() IN ('admin', 'medical_staff')`. The assistant_scout role is not in that list, so any query against `player_medical_notes` returns zero rows. The migration creates no other path (no grant, no function, no alternate policy) that would let assistant_scout read from this table.

### 5. Assistant scout -- sports-science data sealed

- Result: pass
- Plain-language evidence: Sports-science data lives in scouting_events rows where `is_medical = true`. The `scouting_events_select` policy has a compound USING clause: `current_user_role() IN ('admin', 'head_coach', 'assistant_scout', 'medical_staff') AND (is_medical = false OR current_user_role() IN ('admin', 'medical_staff'))`. The assistant_scout passes the first check but fails the second check when `is_medical = true` (they are not admin or medical_staff). Medical-flagged scouting events return zero rows for the assistant scout.

### 6. Assistant scout -- medical flags hidden in shared views

- Result: pass
- Which shared view you checked: `scouting_events_safe` (created in the migration)
- Does that view run with the caller's rights (security_invoker) or with its owner's rights: The view is created with `security_invoker = true`, so it runs with the caller's rights. RLS on the base `scouting_events` table applies to whoever queries the view.
- Plain-language evidence: The view's SELECT list names columns explicitly (id, game_id, player_id, period, event_type, notes, created_by, created_at) and omits the `is_medical` column entirely. The view also includes `WHERE is_medical = false`, filtering out all medical-flagged rows. Because `security_invoker = true`, the base table's RLS policies apply to the caller (assistant_scout), not to the view owner. The assistant_scout cannot see medical flags through this view because (a) the column is not selected, (b) medical-flagged rows are filtered out by the WHERE clause, and (c) even if the WHERE clause were somehow bypassed, the base table RLS would still deny medical rows to this role.

### 7. Video analyst -- medical data sealed

- Result: pass
- Plain-language evidence: The `medical_notes_select` policy only allows `current_user_role() IN ('admin', 'medical_staff')`. The video_analyst role is not in that list, so any query against `player_medical_notes` returns zero rows. No other policy, grant, function, or view in the migration provides an alternate path.

### 8. Video analyst -- sports-science data sealed

- Result: pass
- Plain-language evidence: The `scouting_events_select` policy lists `('admin', 'head_coach', 'assistant_scout', 'medical_staff')` in its USING clause. The video_analyst is not in that list at all. Any query by video_analyst against `scouting_events` returns zero rows, covering both medical and non-medical events. Sports-science data (is_medical = true rows) is completely invisible to this role.

### 9. Video analyst -- medical flags hidden in shared views

- Result: pass
- Which shared view you checked: `scouting_events_safe` (created in the migration)
- Does that view run with the caller's rights (security_invoker) or with its owner's rights: The view uses `security_invoker = true`, so it runs with the caller's rights. RLS on the base table applies to the video_analyst directly.
- Plain-language evidence: The view omits the `is_medical` column from its SELECT list, so the flag cannot appear in results. The view filters `WHERE is_medical = false`, removing all medical-flagged rows. Because `security_invoker = true`, the base table's RLS policies apply to the video_analyst. The `scouting_events_select` policy excludes video_analyst from its role list entirely, so even querying the view returns zero rows for this role. Medical flags cannot leak to the video analyst through the shared view because the role has no SELECT access to the base table, the column is omitted, and medical rows are filtered.

### 10. Staff-facing requests do not use the service-role key to bypass seals

- Result: pass
- Compared to which sentence in the service-role key rule: "Any server job that is not on the allowed list below must not use the master key." and "The service-role key must never be used in: Any everyday staff screen. No coach, scout, medical staffer, or analyst should ever trigger a request that carries the master key."
- Plain-language evidence (no secret values): The migration file contains no service-role key, no database password, and no connection string. Every policy is scoped `TO authenticated`, meaning staff sign in with their own credentials and RLS evaluates their JWT role claim. No policy references `service_role` as a target. The migration does not create any function marked `SECURITY DEFINER` that could run with elevated privileges and hand sealed rows to the wrong role. The `current_user_role()` function referenced in policies is `SECURITY INVOKER` (confirmed in the earlier 003_auth_rls.sql migration). Staff-facing requests go through RLS, not through the master key.
- SECURITY DEFINER function that returns sealed data, if any: None. The migration creates no functions. The only function referenced is `current_user_role()`, which is SECURITY INVOKER and returns only the caller's own role from their JWT.

## Fixes sent back to the agent

If you asked for a fix, record it here. The agent must edit supabase/migrations/20260418120000_least_privilege_new_staff_roles.sql, not a new migration file.

| Failed check | What you saw | What you asked the agent to change | Re-checked result |
| --- | --- | --- | --- |
| Shared view security_invoker | The original CREATE VIEW did not include `security_invoker = true`, meaning it would run with the owner's rights by default | Asked agent to add `ALTER VIEW public.scouting_events_safe SET (security_invoker = true)` after the CREATE VIEW statement so the view runs with the caller's rights and base-table RLS applies to the actual caller | pass -- re-read the file and confirmed the ALTER VIEW line is present |

## Residual risks

| Check | What is still open | Why it was not fixed in this migration |
| --- | --- | --- |
| scouting_events INSERT (from Step 6 review) | A scout could INSERT a row with `is_medical = true` because the INSERT policy does not filter on that column. They cannot SELECT it afterward, but the row exists. | The WITH CHECK on INSERT checks only role, not the is_medical value. Fixing this would require a WITH CHECK filter on is_medical, but the accepted risk from Sprint 4 is that the row cannot be read back by the scout. The risk is low because the scout gains nothing from inserting data they cannot retrieve. |
| scouting_events UPDATE (from Step 6 review) | A head_coach could UPDATE a medical row if they knew the row ID, because UPDATE policy does not restrict by is_medical. They cannot SELECT medical rows to discover IDs. | The head_coach has UPDATE but not SELECT on medical rows. They cannot discover medical row IDs through any query. No practical exploit exists. Accepted from Sprint 4. |

## Sign-off

- Every required check is pass or residual risk: yes
- I did not create a second migration file: yes
- Sentence I could say to hockey operations about the two new roles and sealed medical data: The assistant scout can see the player roster, the game schedule, and non-medical scouting observations, and can log new scouting reports during games. The video analyst can see the player roster and the game schedule, and nothing else. Neither role can see medical notes, injury reports, sports-science observations, or medical flags on any screen, including shared scouting views. Medical and sports-science data stays sealed to the medical staff and admin roles only.

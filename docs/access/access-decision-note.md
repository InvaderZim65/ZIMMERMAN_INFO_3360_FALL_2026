# Access Decision Note -- Mid-Season Staff Hires

**To:** Hockey Operations Lead
**From:** Zach Zimmerman
**Date:** 2026-10-21

---

## The request

Mid-season, hockey operations hired an assistant scout and a video analyst. Both need data from the system to do their jobs. This note records what access each role was given, what stays sealed, how we proved it, and what must not change without a new written decision.

---

## What each role can see

### Assistant scout

When we hire a new assistant scout, they sign in with their own account and can see the player roster, the game schedule, and non-medical scouting observations filed by themselves and other scouts. They can also log new scouting observations during games.

They cannot see medical notes, injury reports, rehab timelines, or any scouting observation that has been flagged as related to a medical or sports-science matter. They cannot edit player records or the game schedule. On shared scouting screens where multiple staff roles can view data at the same time, medical flags are stripped out before the data reaches the screen. The assistant scout will never see a medical marker on a scouting report, even when that report appears alongside non-medical observations they are allowed to read.

### Video analyst

When we hire a new video analyst, they sign in with their own account and can see the player roster and the game schedule. That is all.

They cannot see scouting observations of any kind, medical notes, injury reports, or sports-science data. They cannot add, change, or delete any records in the system. On shared game or scouting screens, medical flags are stripped out, but the video analyst would not see scouting data on those screens in the first place. Their access is limited to knowing who the players are and when games happen so they can organize film review.

---

## Why these limits exist

These limits come from what each job actually needs. The assistant scout attends games, watches prospects, and writes reports. That work requires the roster, the schedule, and the ability to read and create scouting notes. It does not require medical data. A scout who could see injury history or concussion protocols would have information that should stay between the player and the medical team.

The video analyst reviews game film and tags plays for coaches. That work requires player names, positions, and game dates. It does not require scouting evaluations or medical records. Scouting reports contain prospect assessments that are outside the analyst's workflow. Medical data has nothing to do with film review.

Medical and sports-science information is the most sensitive data in the system. It includes injury reports, concussion protocols, rehab timelines, and scouting observations that have been flagged as medically relevant. This data is visible only to the medical staff and to administrators. It stays sealed from all other roles at the database level, meaning the rules that control who can see which rows of data enforce this restriction on every request, regardless of whether someone goes through the normal screens or tries to query the data directly.

---

## What the break-tests proved

We ran a set of break-tests against the live database project. These are planned attempts to do specific actions as specific roles, including actions that should be blocked, to verify the access rules hold. The full results are recorded in `docs/access/role-action-results.md`.

**One allowed read (proof the job still works):** The assistant scout signed in and read game data. The system returned game records with opponents, dates, and venues. This is a pass for the gate because the scout needs schedule access to know which games to attend. Without it, the role cannot do its job.

**One forbidden attempt (proof the seal holds):** The assistant scout signed in and tried to read player medical notes. The system returned nothing. This is a pass for the gate because scouts must not see medical data. The database rules blocked the request before any medical information reached the screen.

**Shared-view medical flags:** The assistant scout and the video analyst both queried the shared scouting view, which is the combined screen that pulls scouting data for multiple roles at once. The medical flag column was not present in the results, and no medically flagged rows appeared. Health and injury notes stay off shared scouting and game screens for both new roles.

All forbidden attempts were blocked. All allowed reads succeeded. No access was wider than the job requires.

---

## The staff master-key rule

The system includes a master key that, if used, skips all the row-level rules described above. Any request carrying this key can read every row in every table, including medical data, regardless of who made the request.

This key is restricted to three server-only jobs that require elevated access: applying database changes during deployment, creating staff accounts and assigning their roles, and setting up automated test accounts in a controlled test environment. These are administrative operations that happen behind the scenes, not actions triggered by a staff member clicking around in the system.

Signed-in staff requests must never use this master key. When a staff member signs in and opens a screen, their request runs through the normal row-level rules. If those rules say the person cannot see medical data, the request gets nothing back. The master key is never involved in that process. Even medical staff, who have the broadest health-data access of any role, get their access through the normal rules, not through the master key.

The key is stored in server environment variables only. It is never saved in the project's code files, never included in browser-visible settings, and never pasted into documentation. If it were to appear in a browser-visible setting (something a web developer might call a client-side environment variable), anyone who opened their browser's developer tools could read it and bypass every access rule in the system.

---

## What can still go wrong

**Wrong role assignment.** If an administrator accidentally assigns someone the wrong role, that person will see data intended for a different job. There is no second-person approval step for role changes. The list of roles is small and should be verified manually when onboarding new staff.

**A new table without access rules.** If a future sprint adds a new table to the database and forgets to add access rules, that table could be readable by anyone who is signed in. The migration review checklist exists to catch this, but it depends on someone actually using it.

**Stale login session after a role change.** When someone's role is changed, their current session still carries the old role until it expires or they sign out. During that window, they operate under the old permissions. Short session lifetimes reduce this window, and forcing a re-login after role changes would close it entirely.

---

## Do not reopen without a new decision

Later work must not reopen medical or sports-science access for the assistant scout or the video analyst unless someone writes a new access decision with its own break-test proof. The promise made in this note is that these two roles cannot see health, injury, or sports-science data, including medical flags on shared screens. Changing that boundary quietly in a database update or a code change would break this promise without anyone reviewing the consequences.

If a future sprint needs to give either role access to medical or sports-science data, start with a new brief, a new matrix update, a new migration review, and a new set of break-tests. Do not skip that process.

---

## Sources

Every claim in this note comes from one of these four files:

| Source | Path |
|--------|------|
| New roles brief | `docs/access/new-roles-brief.md` |
| Access matrix (all five roles) | `docs/access/access-matrix-v2.md` |
| Service-role key rule | `docs/access/service-role-key-rule.md` |
| Break-test results | `docs/access/role-action-results.md` |

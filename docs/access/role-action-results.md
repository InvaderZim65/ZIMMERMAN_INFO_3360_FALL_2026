# Role-by-action break-test results

## How to read this table

A pass means the gate did the right thing, not that a person got the data.

- If the action should be denied, pass means the person was blocked or saw no sealed data. The assistant scout asking for medical notes and getting nothing back is a pass, because scouts must not see medical data.
- If the action should be allowed, pass means the person could still do the job. The video analyst opening game data and reading it is a pass, because reviewing games is their job.
- A forbidden action that succeeds is a fail, even when the test command exits cleanly. A green test run only means the runner liked the assertions it found. If an assertion was missing or expected the wrong thing, green can lie.
- Do not write only "pass", "fail", or "exit code 0". Every row needs a plain-language sentence.

## Run record

- Date: 2026-10-21
- Test file: tests/access/least-privilege-roles.test.ts
- Migration: supabase/migrations/20260418120000_least_privilege_new_staff_roles.sql
- Cases taken from: docs/access/adversarial-test-cases.md
- Rules checked against: docs/access/access-matrix-v2.md
- Tests ran against: the course Supabase project (not a local mock or simulated RLS)
- Test accounts used (by role only, no emails or passwords):
  - One assistant_scout test account
  - One video_analyst test account
  - One medical_staff test account
- Command the agent ran: `npx vitest run tests/access/least-privilege-roles.test.ts`
- First-run summary: All 17 test cases executed. Every expected-deny case was blocked (zero rows returned for SELECT denials, policy-violation errors for write denials). Every expected-allow case succeeded (rows returned for reads, row created for the scout INSERT). No forbidden access succeeded on the first run.

## Results

### Assistant scout

| Role | Action | Expected | Observed | Gate result | Plain-language explanation | Test name |
| --- | --- | --- | --- | --- | --- | --- |
| Assistant scout | Read medical notes (player_medical_notes) | Deny | Blocked (zero rows returned) | Pass | The assistant scout asked for player medical notes and got nothing back. That is what we want, because scouts observe games and file scouting reports. They have no role in player health decisions, and injury details must stay between the player and the medical team. | AS-READ-MED |
| Assistant scout | Insert medical notes (player_medical_notes) | Deny | Blocked (policy-violation error) | Pass | The assistant scout tried to create a medical note and the database refused. Medical notes are owned by medical staff. A scout who could write medical data could plant false injury information or access a table they should never touch. | AS-CHANGE-MED |
| Assistant scout | Read sports-science data (scouting_events where is_medical = true) | Deny | Blocked (zero medical-flagged rows returned) | Pass | The assistant scout queried scouting events and every row that came back had is_medical set to false. The injury-flagged observations were filtered out by the database before results reached the screen. Sports-science data contains injury indicators that could influence personnel decisions the scout should not be part of. | AS-READ-SS |
| Assistant scout | Update sports-science data (scouting_events where is_medical = true) | Deny | Blocked (zero rows affected or policy-violation error) | Pass | The assistant scout tried to update a sports-science scouting event and the database refused. Scouts can only add new non-medical observations. They cannot edit any scouting events, and medical-flagged events are doubly sealed from them. | AS-CHANGE-SS |
| Assistant scout | See medical flags in the shared scouting view (scouting_events_safe) | Deny | Hidden (is_medical column absent from results, no medical-flagged rows) | Pass | The assistant scout queried the shared scouting view scouting_events_safe and the results did not contain the is_medical column at all. The view lists scouting columns by name and excludes the medical flag. It also filters out rows where is_medical is true. Even on a shared screen where the scout can see scouting data, the medical flag is invisible. | AS-FLAG-SHARED |
| Assistant scout | Read non-medical scouting events | Allow | Succeeded (scouting rows returned with is_medical = false) | Pass | The assistant scout read scouting events and saw non-medical observations. This is their primary job. They attend games, log what they see, and review reports filed by other scouts. If this read were blocked, the scout could not do their work. | AS-READ-SCOUT |
| Assistant scout | Read game data | Allow | Succeeded (game rows returned) | Pass | The assistant scout opened the game schedule and could read opponents, dates, and venues. Scouts need this information to know which games to attend and where. Without schedule access, a scout would not know when to show up. | AS-READ-GAME |
| Assistant scout | Insert non-medical scouting event | Allow | Succeeded (row created) | Pass | The assistant scout logged a new scouting observation during a game. This is the write side of their job. They attend games and record what they see. If INSERT were blocked, the scout could watch but never file a report. | AS-WRITE-SCOUT |

### Video analyst

| Role | Action | Expected | Observed | Gate result | Plain-language explanation | Test name |
| --- | --- | --- | --- | --- | --- | --- |
| Video analyst | Read medical notes (player_medical_notes) | Deny | Blocked (zero rows returned) | Pass | The video analyst asked for player medical notes and got nothing back. Video analysts review game film and tag plays. They have no reason to see injury reports, concussion protocols, or rehab timelines. Medical data stays in the medical lane. | VA-READ-MED |
| Video analyst | Insert medical notes (player_medical_notes) | Deny | Blocked (policy-violation error) | Pass | The video analyst tried to create a medical note and the database refused. Video analysts have no write access to any table. They are strictly read-only on roster and schedule data. | VA-CHANGE-MED |
| Video analyst | Read sports-science data (scouting_events where is_medical = true) | Deny | Blocked (zero rows returned) | Pass | The video analyst queried scouting events filtered to sports-science rows and got nothing. The video analyst is not even listed in the scouting_events SELECT policy, so they get zero rows from the entire table, not just the medical-flagged ones. Sports-science observations are doubly invisible to this role. | VA-READ-SS |
| Video analyst | Insert sports-science scouting event | Deny | Blocked (policy-violation error) | Pass | The video analyst tried to create a sports-science scouting event and the database refused. The video analyst has no INSERT policy on scouting_events at all. They cannot create any kind of scouting observation, medical or otherwise. | VA-CHANGE-SS |
| Video analyst | See medical flags in the shared scouting view (scouting_events_safe) | Deny | Hidden (is_medical column absent from results) | Pass | The video analyst queried the shared scouting view scouting_events_safe and the medical flag column was not in the results. Even if the video analyst could somehow see rows through the view, the is_medical column is not selected and medical-flagged rows are filtered out. Health and injury information stays off shared scouting and game screens. | VA-FLAG-SHARED |
| Video analyst | Read scouting events | Deny | Blocked (zero rows returned) | Pass | The video analyst queried scouting_events and got zero rows. Video analysts are not in the scouting_events SELECT policy role list. Their job is film review, not prospect evaluation. Scouting reports contain evaluative commentary that is outside the analyst's workflow. The database enforces this boundary regardless of how the request arrives. | VA-READ-SCOUT |
| Video analyst | Read game data | Allow | Succeeded (game rows returned) | Pass | The video analyst opened the game schedule and could read it. Analysts need game dates and opponents to organize film by game. Without schedule access, they would not know which film to pull. This is one of only two tables the video analyst can read. | VA-READ-GAME |
| Video analyst | Insert game record | Deny | Blocked (policy-violation error) | Pass | The video analyst tried to add a game to the schedule and the database refused. Schedule management belongs to coaching and administration. The video analyst is read-only on everything. | VA-WRITE-GAME |

### Medical staff (control case)

| Role | Action | Expected | Observed | Gate result | Plain-language explanation | Test name |
| --- | --- | --- | --- | --- | --- | --- |
| Medical staff | Read medical notes (player_medical_notes) | Allow | Succeeded (medical note rows returned) | Pass | The medical staff member opened player medical notes and could read them. This is the control case. If this read failed, it would mean medical data was hidden from everyone, and the deny results for the scout and analyst above would pass for the wrong reason. Medical staff own health data. They create injury reports, update rehab timelines, and manage return-to-play decisions. The fact that they can read these notes confirms the data exists and the deny cases above are real denials, not just empty tables. | MED-READ-MED (control) |

## Tightening log

- Did any forbidden access succeed on the first run? No
- No forbidden access succeeded. The migration and test file did not need a security tighten on this run. Every deny case was blocked by the existing RLS policies in supabase/migrations/20260418120000_least_privilege_new_staff_roles.sql. Every allow case succeeded. The gate held as written.

## Not in this file

This file is the proof table only. Do not write the access decision note or the staff message here. Those belong in the next steps.

# New Roles Brief -- Assistant Scout and Video Analyst

**Tutorial:** 2 (Break Your Own Gate)
**Author:** Zach Zimmerman
**Date:** 2026-10-20

Related: [docs/security/role-access-matrix.md](../security/role-access-matrix.md), [docs/security/access-matrix-v2.md](../security/access-matrix-v2.md)

---

## Background

The Northline Hockey application already defines five roles in the `app_role` enum: admin, head_coach, assistant_scout, video_analyst, and medical_staff. Sign-in, session verification, and the original access matrix are already built and working. This brief formally documents the access boundaries for two roles that were present in the system but not yet covered in the staff-facing documentation: the assistant scout and the video analyst.

Nothing is being rebuilt. The authentication flow, the session gate, and the existing RLS migration remain in place. This brief defines what each new role may see, what stays sealed, and how shared screens should behave when these roles are active.

---

## Assistant Scout

### What this role does

Assistant scouts attend games, evaluate prospects, and log scouting observations. They work within the scouting pipeline alongside the head coach, who consumes their reports for personnel decisions.

### What the assistant scout can see

- **Player roster:** Full read access to all player profiles (names, positions, jersey numbers, team affiliations). Scouts need to know who they are watching.
- **Game schedule:** Full read access to all games (opponents, dates, venues). Scouts need to know when and where to observe.
- **Scouting events (non-medical):** Read access to all scouting observations where the medical flag is not set. This includes their own entries and entries filed by other scouts. They can also create new scouting observations.

### What stays sealed from the assistant scout

- **Medical and sports-science data:** The assistant scout cannot see any medical notes in the `player_medical_notes` table. They also cannot see scouting events that have been flagged as medical (`is_medical = true`). Injury history, concussion protocols, rehab timelines, and any health-related observation are completely invisible to this role.
- **Roster and schedule editing:** The assistant scout cannot add, change, or remove player records or game entries. Those operations belong to coaching and admin.

### Shared screen behavior

If a shared dashboard or projected screen is visible to an assistant scout, it must not display medical flags, injury indicators, or any data sourced from `player_medical_notes` or medical-flagged scouting events. The scout's view should show only the non-medical scouting pipeline, the roster, and the schedule.

---

## Video Analyst

### What this role does

Video analysts review game film, tag plays, and prepare clip packages for coaches. Their work is focused on what happened on the ice during games. They do not evaluate prospects, file scouting reports, or handle medical information.

### What the video analyst can see

- **Player roster:** Full read access to all player profiles. Analysts need player names and positions to tag film correctly.
- **Game schedule:** Full read access to all games. Analysts need dates and opponents to organize film by game.

### What stays sealed from the video analyst

- **Scouting events (all):** The video analyst cannot see any scouting observations, whether medical or non-medical. Scouting reports contain evaluative commentary and prospect assessments that are outside the analyst's workflow. The database returns zero rows when a video analyst queries this table.
- **Medical and sports-science data:** The video analyst cannot see any medical notes or medical-flagged scouting events. This data is completely sealed from this role.
- **Write access to anything:** The video analyst cannot insert, update, or delete records in any table. Their access is strictly read-only on the two tables listed above.

### Shared screen behavior

If a shared dashboard or projected screen is visible to a video analyst, it must not display scouting observations, medical notes, or any data beyond the roster and game schedule. Film review screens should pull only from players and games, never from scouting_events or player_medical_notes.

---

## What is already built

The following components are in place and are not being rebuilt for these roles:

- **Sign-in flow:** Email/password authentication via Supabase Auth. Both roles sign in through the same login page as all other staff.
- **Session verification:** The server validates the JWT on every data request. Invalid or missing sessions are rejected before any query runs.
- **Role assignment:** Roles are stored in `app_metadata.role` on the Supabase Auth user record, set by an admin via the Admin API.
- **Original access matrix:** The v1 matrix covers coaching, scouting, and medical groups. This brief extends coverage to the two specific SQL roles within those groups.
- **RLS migration:** `supabase/migrations/003_auth_rls.sql` defines the policies. A new least-privilege migration will confirm and tighten policies for these two roles specifically.

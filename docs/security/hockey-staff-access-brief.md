# Hockey Staff Access Brief -- Northline Hockey

**Sprint:** 4 (Auth, RLS, Roles, Medical Gating)
**Author:** Zach Zimmerman
**Date:** 2026-10-16

---

## 1. Who are the staff?

Northline Hockey's staff breaks into three functional groups that interact with the application:

- **Coaching staff** -- Head coach and assistants. They run practices, set game-day lineups, and make personnel decisions. They need broad visibility into player performance and scouting but have no business seeing medical details.
- **Scouting staff** -- Assistant scouts who attend games, evaluate prospects, and log observations. Their work feeds directly into coaching decisions, but they operate independently and only need access to their own scouting pipeline plus general player/game info.
- **Medical staff** -- Athletic trainers, team physicians, and sports-science personnel. They manage injury records, return-to-play timelines, and physical assessments. Their data is the most sensitive in the system.

---

## 2. What data exists in the system?

| Data category | Examples | Primary owners |
|---------------|----------|----------------|
| Scouting notes | Game observations, prospect evaluations, period-by-period event logs | Scouting staff |
| Medical / sports-science data | Injury reports, concussion protocols, rehab timelines, medical notes | Medical staff |
| Game data | Schedules, scores, opponent info | Coaching staff (managed by admin) |
| Player records | Roster info, positions, biographical details | Coaching staff (managed by admin) |
| Practice plans | Drill sequences, line combinations, session goals | Coaching staff |

---

## 3. Who is harmed if data leaks?

- **Players** are the primary victims. Leaked medical records (injury history, concussion counts, mental health notes) can damage a player's trade value, contract negotiations, and personal reputation. In junior and college hockey, players have limited leverage and a leaked injury report could end a prospect's career path.
- **The organization** faces legal liability if medical information is disclosed to unauthorized staff. Even within the org, a coach who learns about a player's undisclosed injury through a system leak could make roster decisions that put the player at physical risk.
- **Scouting staff** produce proprietary evaluations. If scouting notes leak to opposing teams or agents, it undermines the organization's competitive advantage and draft strategy.
- **Medical staff** lose patient trust. If trainers and physicians cannot guarantee that their notes stay within the medical circle, players may underreport injuries, which creates a direct safety problem.

---

## 4. What must stay private?

**Medical data is sealed from non-medical roles.** This is the hardest boundary in the system. Medical notes (`player_medical_notes`) and medical-flagged scouting events (`is_medical = true`) must be invisible to coaching and scouting staff. Only admin and medical staff should ever see this data. This matches how the RLS policies are already built.

**Scouting notes are limited to coaching and scouting roles.** Scouts and coaches can see non-medical scouting observations. Video analysts and medical staff cannot -- video analysts do film review, not prospect evaluation, and medical staff have no role in scouting decisions. Scouting data should not leak outside the organization under any circumstances.

**Player records and game schedules are broadly readable** within the authenticated staff. Everyone on staff needs to know who the players are and when games happen. Write access is restricted to coaching and admin roles.

**Practice plans** are coaching-internal. Scouts and medical staff do not need drill-level detail, though this boundary is less critical than the medical wall.

---

## 5. Stakeholder access needs (plain language)

**From the coaching perspective:** "We need to see every player's profile, the full game schedule, and all the scouting reports our scouts file. We need to add and edit players and games. We do not need to see medical records -- that is between the player and the training staff. Just tell us if someone is cleared to play or not."

**From the scouting perspective:** "We need to log observations during games and see the scouting reports we and other scouts have filed. We need read access to player profiles and the schedule so we know who we are watching and when. We should not be editing rosters or schedules, and we definitely should not see medical notes."

**From the medical perspective:** "We need full control over medical records. We need read access to the roster and schedule so we know who our players are and when they play. We should not be seeing scouting reports -- that is between the scouts and coaching. We should not be editing game schedules or player biographical info -- that is an admin or coaching function."

---

## 6. Summary of access boundaries

- Medical data flows only to admin + medical staff. No exceptions.
- Scouting data flows to coaching and scouting staff only. Not to video analysts or medical staff.
- Player/game data is readable by all authenticated staff. Writable by coaching + admin only.
- Deny by default: if a role is not explicitly granted access, it gets nothing.
- Unauthenticated users see zero data. The database enforces this, not just the UI.

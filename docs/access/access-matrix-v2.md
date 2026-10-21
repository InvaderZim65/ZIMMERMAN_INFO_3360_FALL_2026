# Access Matrix v2 -- All Five Roles

**Tutorial:** 2 (Break Your Own Gate)
**Step:** 5
**Author:** Zach Zimmerman
**Date:** 2026-10-21

This file is the contract for a later database change. It contains no SQL and no migration. The database change will be written separately after this matrix is reviewed and accepted.

**Sources:** [docs/access/new-roles-brief.md](new-roles-brief.md), [docs/access/overgrant-audit.md](overgrant-audit.md), [docs/access/service-role-key-rule.md](service-role-key-rule.md)

---

## Matrix

### Scouting notes (non-medical scouting events)

| Role | Action | Because |
|------|--------|---------|
| Coaching | See (unchanged from earlier matrix) | Coaches consume scouting reports to make personnel and game-day decisions. |
| Scouting | See and add (unchanged from earlier matrix) | Scouts attend games, log observations, and review reports filed by themselves and other scouts. |
| Assistant scout | See and add | Assistant scouts attend games and log observations the same way the scouting role does, because their job is evaluating prospects and recording what they see. |
| Video analyst | See only | Video analysts review game film alongside scouting observations so they can align their film notes with what scouts reported on the ice. |
| Medical | Deny (unchanged from earlier matrix) | Medical staff have no role in scouting decisions. Scouting observations stay in the coaching and scouting pipeline. |

### Game data (schedules, scores, opponents)

| Role | Action | Because |
|------|--------|---------|
| Coaching | See, add, and change (unchanged from earlier matrix) | Coaches manage the schedule and record game results. |
| Scouting | See only (unchanged from earlier matrix) | Scouts need the schedule to know which games to attend but do not manage it. |
| Assistant scout | See only | Assistant scouts need the schedule to know when and where to scout, but schedule management is a coaching function. |
| Video analyst | See only | Video analysts need game dates and opponents to organize their film review, but they do not manage the schedule. |
| Medical | See only (unchanged from earlier matrix) | Medical staff need the schedule to plan coverage and travel but do not manage it. |

### Medical records (player_medical_notes)

| Role | Action | Because |
|------|--------|---------|
| Coaching | Deny (unchanged from earlier matrix) | Coaches must not see injury details, concussion history, or rehab timelines. They receive only cleared/not-cleared status through a separate channel. |
| Scouting | Deny (unchanged from earlier matrix) | Scouts have no role in player health decisions. |
| Assistant scout | Deny | Assistant scouts have no reason to access medical data. Their job is game observation, not player health. |
| Video analyst | Deny | Video analysts review film, not medical records. No medical data is relevant to their work. |
| Medical | See, add, and change (unchanged from earlier matrix) | Medical staff are the owners of health data. They create injury reports, update rehab timelines, and manage return-to-play decisions. |

### Sports-science data (injury-flagged scouting events where is_medical = true)

| Role | Action | Because |
|------|--------|---------|
| Coaching | Deny (unchanged from earlier matrix) | Sports-science observations contain injury indicators that coaches must not see. Same reasoning as medical records. |
| Scouting | Deny (unchanged from earlier matrix) | Scouts must not see injury-flagged observations. |
| Assistant scout | Deny | Assistant scouts must not see sports-science data. Their scouting access is limited to non-medical observations only. |
| Video analyst | Deny | Video analysts must not see any injury or sports-science information. |
| Medical | See (unchanged from earlier matrix) | Medical staff need to see injury-flagged scouting events to correlate on-ice incidents with medical assessments. |

### Medical flags in shared scouting views

| Role | Action | Because |
|------|--------|---------|
| Coaching | Deny (unchanged from earlier matrix) | Shared scouting screens that coaching can open must omit medical flags so coaches cannot learn medical status from the scouting view. |
| Scouting | Deny (unchanged from earlier matrix) | Same reasoning. Scouting screens must not reveal medical flags. |
| Assistant scout | Deny | Scouting screens that assistant scouts can open must omit medical flags. Hiding the medical table alone does not satisfy this rule because a flag column on a shared scouting view would still leak medical status. |
| Video analyst | Deny | Scouting or game screens that video analysts can open must omit medical flags. Even if the video analyst cannot see the medical table, a flag on a shared screen would reveal injury information. |
| Medical | See (unchanged from earlier matrix) | Medical staff may see medical flags because that information is within their role. |

### Service-role key

| Role | Action | Because |
|------|--------|---------|
| Coaching | Never | See docs/access/service-role-key-rule.md. No staff screen carries the master key. |
| Scouting | Never | See docs/access/service-role-key-rule.md. No staff screen carries the master key. |
| Assistant scout | Never | See docs/access/service-role-key-rule.md. The assistant scout signs in with their own credentials and RLS decides what they see. |
| Video analyst | Never | See docs/access/service-role-key-rule.md. The video analyst signs in with their own credentials and RLS decides what they see. |
| Medical | Never | See docs/access/service-role-key-rule.md. Even medical staff, who have the broadest health-data access, must not use the master key. Their access comes from RLS policies, not from bypassing them. |

---

## Narrowed from the audit

The overgrant audit (docs/access/overgrant-audit.md) found no grants that are too broad for the new roles. The video analyst has no scouting_events policy (correct implicit deny). The assistant scout has SELECT on non-medical scouting events and INSERT for new observations (correct for the job). Medical data is sealed from both new roles at the database level.

Because the audit found no overgrants, no cells were narrowed in this matrix. The new roles received only the specific permissions their jobs require, starting from zero access and granting upward.

---

## Shared-screen rule

Scouting screens that the assistant scout, video analyst, or scouting role can open must omit medical flags. This means the database query behind any shared scouting view must filter out rows where is_medical is true before results reach the screen. Hiding the medical notes table alone is not enough because a medical flag on a scouting event row would still reveal injury information to roles that must not see it.

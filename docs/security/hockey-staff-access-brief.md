# Hockey Staff Access Brief -- Northline Hockey

**Sprint:** 4 (Auth, RLS, Roles)
**Author:** Zach Zimmerman
**Date:** 2026-10-20

---

## 1. Client story

Northline Hockey's operations director described the privacy concern in a recent meeting: "Our coaching, scouting, and medical staff all use the same application to manage players, games, and observations. Right now nothing stops a coach from opening a medical file, or a scout from reading another group's private notes. We need the system to enforce boundaries so that each group sees only what their job requires."

Three staff groups interact with the application:

- **Coaching staff** -- Head coach and assistants. They run practices, set lineups, and make personnel decisions. They need scouting reports and player data but must never see medical records.
- **Scouting staff** -- Assistant scouts who attend games, evaluate prospects, and log observations. They need their own scouting pipeline plus read access to players and schedules. They must not see medical data or edit rosters.
- **Medical staff** -- Athletic trainers, physicians, and sports-science personnel. They manage injury records, return-to-play timelines, and physical assessments. Their data is the most sensitive in the system and must stay within the medical circle.

---

## 2. Sensitive data inventory

| Data category | Examples | Primary owners |
|---------------|----------|----------------|
| Scouting notes | Game observations, prospect evaluations, period-by-period event logs | Scouting staff |
| Medical / sports-science data | Injury reports, concussion protocols, rehab timelines, medical notes | Medical staff |
| Game data | Schedules, scores, opponent info | Coaching staff (managed by admin) |
| Player records | Roster info, positions, biographical details | Coaching staff (managed by admin) |
| Practice plans | Drill sequences, line combinations, session goals | Coaching staff |

---

## 3. Who is harmed if data leaks?

- **Players** are the primary victims. Leaked medical records (injury history, concussion counts, mental health notes) can damage a player's trade value, contract negotiations, and personal reputation. In junior and college hockey, a leaked injury report could end a prospect's career path.
- **The organization** faces legal liability if medical information reaches unauthorized staff. A coach who learns about a player's undisclosed injury through a system leak could make roster decisions that put the player at physical risk.
- **Scouting staff** produce proprietary evaluations. If scouting notes leak to opposing teams or agents, it undermines the organization's competitive advantage.
- **Medical staff** lose patient trust. If trainers cannot guarantee their notes stay private, players may underreport injuries, creating a direct safety problem.

---

## 4. Why hiding UI elements is not enough

The current application has no access enforcement. A motivated user could bypass any UI-only restriction:

1. **Browser DevTools** -- Anyone can inspect network requests, find the API endpoint, and replay the request with different parameters.
2. **Direct API calls** -- The Supabase project URL and anon key are embedded in the client bundle. A user who knows these values can query any table from a REST client or the browser console without touching the application UI at all.
3. **Accidental exposure** -- A future code change might add a page, route, or server function that returns data the developer did not realize was sensitive. If the only protection is a missing button, the data is one accidental link away from leaking.

Hiding a navigation tab or disabling a button improves the user experience (do not show coaches a "Medical Notes" tab they should not use), but it provides zero security. The data is still one HTTP request away.

---

## 5. Required protections

To enforce the access boundaries described in this brief, the application requires three layers of protection. These are requirements for Sprint 4 implementation:

### 5a. Signed-in identity (authentication)

Every staff member must authenticate with a verified identity before the application returns any data. Anonymous or unauthenticated requests must receive zero rows from every table. The system must know *who* is making each request, not just that someone is using the application.

### 5b. Server-side session verification

Every data request must be validated on the server before any query runs. The server must check that the session token is present, not expired, and not tampered with. This check must happen in server functions, not in client-side code that a user could modify. If the session is invalid, the request must be rejected immediately with no data returned.

### 5c. Database row-level authorization (RLS)

The database itself must enforce which rows each role can read and write. Row-Level Security policies must run on every query regardless of whether the request comes from the application UI, a direct API call, or a server function. This is the final enforcement layer: even if every other layer fails, the database still refuses to return unauthorized rows.

All three layers are required. Authentication without session checks allows token replay. Session checks without RLS allow application bugs to leak data. RLS without authentication allows anonymous access. The layers work together.

---

## 6. Access boundaries (what each role needs)

**From the coaching perspective:** "We need to see every player's profile, the full game schedule, and all the scouting reports our scouts file. We need to add and edit players and games. We do not need to see medical records. Just tell us if someone is cleared to play or not."

**From the scouting perspective:** "We need to log observations during games and see the scouting reports we and other scouts have filed. We need read access to player profiles and the schedule so we know who we are watching and when. We should not be editing rosters or schedules, and we should not see medical notes."

**From the medical perspective:** "We need full control over medical records. We need read access to the roster and schedule so we know who our players are and when they play. We should not be seeing scouting reports. We should not be editing game schedules or player biographical info."

**Boundary summary:**
- Medical data flows only to admin + medical staff. No exceptions.
- Scouting data flows to coaching and scouting staff only.
- Player/game data is readable by all authenticated staff. Writable by coaching + admin only.
- Deny by default: if a role is not explicitly granted access, it gets nothing.
- Unauthenticated users see zero data. The database enforces this, not the UI.

---

## 7. Scope

### In scope for Sprint 4

- Email/password authentication for all staff roles
- Server-side session verification on every data request
- Database RLS policies matching the access boundaries above
- Role assignment via admin-managed app_metadata
- A role access matrix translating these boundaries into table-level permissions

### Out of scope (future sprints)

- Password reset and account recovery UI
- Self-service role requests or manager-approved role changes
- Audit logging of data access events
- UI indicators showing the current user's role and hiding irrelevant navigation
- Caseload-level filtering for medical staff (team-wide access accepted for now)

---

## 8. Success criteria

This brief is satisfied when:

1. An unauthenticated user can query any table via direct API call and receive zero rows.
2. A coaching-role user can read players, games, and non-medical scouting events but receives zero rows from the medical notes table and zero medical-flagged scouting events.
3. A scouting-role user can read and write scouting events and read players/games but cannot write to players/games and receives zero medical data.
4. A medical-role user can read and write medical notes, read players/games, and see medical-flagged scouting events but cannot write to players/games or read non-medical scouting data.
5. All enforcement holds even when the request bypasses the application UI (tested via direct Supabase API calls).

---

## 9. Open stakeholder questions

1. **How should cleared-to-play status reach coaches?** Medical staff control injury records, but coaches need to know if a player is available. Should the system expose a boolean "cleared" flag without revealing the medical detail, or is this handled outside the application?
2. **Should scouting notes be editable by coaches?** The current boundary gives coaching read-only access to scouting. If head coaches need to annotate or flag reports, this boundary changes.
3. **Medical caseload boundaries** -- Should each medical staff member see only their assigned players, or is team-wide medical access acceptable? Team-wide is simpler but less restrictive.
4. **Are there additional roles?** The brief covers coaching, scouting, and medical. If other groups (e.g., video analysts) need access, their permissions must be defined before implementation begins.

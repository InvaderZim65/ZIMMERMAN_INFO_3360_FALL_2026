# Role Access Matrix -- Hockey Staff (Sprint 4)

Source brief: docs/security/hockey-staff-access-brief.md

**Author:** Zach Zimmerman
**Date:** 2026-10-16

---

## Access Matrix

Deny-by-default: any data category or operation not listed below is **denied** for that role.

| Data Category | Coaching | Scouting | Medical |
|---------------|----------|----------|---------|
| Scouting notes (non-medical) | Read -- team-wide | Read + Write -- own | Read -- team-wide |
| Medical / sports-science data | Deny | Deny | Read + Write -- caseload |
| Game schedule | Read + Write -- team-wide | Read -- team-wide | Read -- team-wide |
| Player roster | Read + Write -- team-wide | Read -- team-wide | Read -- team-wide |
| Practice plans | Read + Write -- team-wide | Deny | Deny |

### Column definitions

- **Coaching** -- Head coach and assistant coaches. Broad visibility for game-day and personnel decisions.
- **Scouting** -- Assistant scouts. Focused on prospect evaluation and game observation logging.
- **Medical** -- Athletic trainers, physicians, sports-science staff. Full control over health data, limited to their caseload.

### Scope definitions

- **own** -- the user can only access records they personally created.
- **caseload** -- the user can access records for players assigned to their care.
- **team-wide** -- the user can access all records in that category across the organization.

---

## Cell rationale

| Cell | Why |
|------|-----|
| Coaching + Scouting notes = Read | Coaches consume scouting intel but do not author reports. |
| Scouting + Scouting notes = Read + Write (own) | Scouts create observations and can review their own past entries. They cannot edit another scout's notes. |
| Medical + Scouting notes = Read | Medical staff read injury-adjacent scouting observations for correlation with training room findings. They do not author scouting reports. |
| Medical + Medical data = Read + Write (caseload) | Medical staff have full control over health records for players in their care. They cannot see another provider's private notes unless the patient is shared. |
| Coaching + Medical data = Deny | Coaches must not see injury details, concussion history, or rehab timelines. They receive only cleared/not-cleared status through a separate channel. |
| Scouting + Medical data = Deny | Scouts have no role in player health decisions. |
| Scouting + Practice plans = Deny | Scouts do not need drill-level coaching detail. |
| Medical + Practice plans = Deny | Medical staff do not need practice planning access. They receive activity-level clearance requests separately. |

---

## Open questions

1. **How are roles assigned?** Current implementation stores the role in `app_metadata.role` on the Supabase Auth user record, set by an admin via the Admin API. Is there a need for self-service role requests or manager-approved role changes?
2. **Scouting notes -- should coaches have Write access?** The current matrix gives coaching Read-only on scouting notes. If head coaches need to annotate or flag reports, this cell would change to Read + Write (team-wide).
3. **Medical caseload boundaries** -- how is "caseload" determined? Is it a manual assignment by the head trainer, or is every medical staff member assumed to have access to all players? If team-wide medical access is acceptable, the scope changes from "caseload" to "team-wide."
4. **Video analyst role** -- this matrix covers the three core staff groups. The video analyst role (defined in the system) is excluded here because the brief focuses on coaching, scouting, and medical. Video analysts have Read-only access to players and games and are denied scouting and medical data.
5. **Medical-flagged scouting events** -- scouting events with `is_medical = true` are currently visible only to admin and medical staff. Should coaching see a redacted version (event timestamp and game context without the medical detail)?

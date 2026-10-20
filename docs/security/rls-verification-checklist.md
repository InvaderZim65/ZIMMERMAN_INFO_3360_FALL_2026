# RLS Verification Checklist

**Sprint:** 4 (Auth, RLS, Roles, Medical Gating)
**Author:** Zach Zimmerman
**Date:** 2026-10-16

---

## Purpose

This checklist documents the Row Level Security (RLS) verification steps for the Northline Hockey application. Each item confirms that Supabase RLS policies enforce the expected access boundaries per role.

---

## Role-based read access

- [x] **admin** can SELECT from all tables (players, games, scouting_events, player_medical_notes)
- [x] **head_coach** can SELECT from players, games, and non-medical scouting_events
- [x] **head_coach** CANNOT see scouting_events where is_medical = true
- [x] **assistant_scout** can SELECT from players, games, and non-medical scouting_events
- [x] **assistant_scout** CANNOT see scouting_events where is_medical = true
- [x] **video_analyst** can SELECT from players and games only
- [x] **video_analyst** gets zero rows from scouting_events and player_medical_notes
- [x] **medical_staff** can SELECT from players, games, scouting_events (including is_medical = true), and player_medical_notes

## Medical data gating

- [x] player_medical_notes is only visible to admin and medical_staff
- [x] Scouting events with is_medical = true are hidden from head_coach
- [x] Scouting events with is_medical = true are hidden from assistant_scout
- [x] Scouting events with is_medical = true are hidden from video_analyst
- [x] Scouting events with is_medical = true are visible to admin and medical_staff

## Unauthenticated access

- [x] Unauthenticated users (no session / anon key only) get zero rows from players
- [x] Unauthenticated users get zero rows from games
- [x] Unauthenticated users get zero rows from scouting_events
- [x] Unauthenticated users get zero rows from player_medical_notes

## Write operation restrictions

- [x] **players INSERT** restricted to admin and head_coach
- [x] **players UPDATE** restricted to admin and head_coach
- [x] **players DELETE** restricted to admin only
- [x] **games INSERT** restricted to admin and head_coach
- [x] **games UPDATE** restricted to admin and head_coach
- [x] **games DELETE** restricted to admin only
- [x] **scouting_events INSERT** restricted to admin and assistant_scout
- [x] **scouting_events UPDATE** restricted to admin and head_coach
- [x] **scouting_events DELETE** restricted to admin only
- [x] **player_medical_notes INSERT** restricted to admin and medical_staff
- [x] **player_medical_notes UPDATE** restricted to admin and medical_staff
- [x] **player_medical_notes DELETE** restricted to admin and medical_staff

## Verification method

All checks above were validated by the automated break test suite:

```
npx vitest run src/test/rls-break-tests.test.ts
```

Results are documented in `docs/break-test-results.md`.

---

## Notes

- RLS policies use the `current_user_role()` SQL function which reads the role from the JWT's `app_metadata`.
- The server Supabase client uses the ANON key (not service_role), so RLS applies to all server-side queries.
- The `is_medical` boolean on scouting_events is enforced at the database level, not the application level. Even direct database queries respect this boundary.

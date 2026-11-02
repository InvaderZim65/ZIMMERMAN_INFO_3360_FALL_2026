# Sprint 5 -- Boundary Notes

## System Boundaries

### Frontend (React / TanStack Router)

- Displays game events and evaluation forms.
- Calls server functions via TanStack Start RPC (not raw fetch to /api/).
- Does NOT perform validation -- all validation happens server-side.
- May show optimistic UI but must reconcile with server response.
- Handles rendering of validation error messages returned from the server.

### Backend (Nitro / TanStack Start Server Functions)

- Owns all validation logic (src/lib/events/validate.ts).
- Builds idempotency keys and checks for duplicates before inserting.
- Authenticates requests via requireSession() before any database write.
- Returns structured error responses ({ errors: [{ field, message }] }).
- Never trusts client-provided IDs for the coach_id field on evaluations -- always derives from session.

### Database (Supabase / Postgres)

- Enforces UNIQUE constraint on game_events.idempotency_key as a safety net.
- CHECK constraints on event_type and period/rating ranges.
- Foreign keys: game_id -> games(id), player_id -> players(id).
- RLS policies (future sprint) will restrict who can insert/read events and evaluations.
- Timestamps (received_at, created_at, updated_at) default to now() at the database level.

### Manual Processes

- Provider onboarding: new event providers get a provider_id assigned manually by ops staff. No self-registration.
- Correction review: when a 409 Conflict occurs, the provider must manually decide whether to send a corrected event with a new ID.
- Evaluation follow-up: coaches review submitted evaluations manually; no automated aggregation yet.

## Open Decisions

| # | Decision                                  | Status   | Notes                                       |
|---|-------------------------------------------|----------|---------------------------------------------|
| 1 | Provider allowlist / API key auth         | Deferred | Currently any authenticated user can POST events. Provider-level auth keys are a future sprint. |
| 2 | Batch ingestion endpoint                  | Deferred | Single-event endpoint only in Sprint 5. Batch (array) endpoint planned for a future sprint. |
| 3 | PATCH for corrections                     | Deferred | 409 Conflict is the current response for key collisions with different data. A PATCH /api/events/:id endpoint could allow in-place corrections. |
| 4 | RLS policies on game_events               | Deferred | Table exists without row-level security in Sprint 5. Policies will be added when role-based event access is designed. |
| 5 | Evaluation uniqueness constraint          | Deferred | Currently a coach can submit multiple evaluations for the same player/game. A UNIQUE(game_id, coach_id, player_id) constraint may be added. |
| 6 | Event soft-delete vs hard-delete          | Deferred | No delete endpoint in Sprint 5. Soft-delete (is_deleted flag) is preferred when added. |

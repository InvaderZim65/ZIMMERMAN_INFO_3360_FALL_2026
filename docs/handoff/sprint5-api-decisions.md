# Sprint 5 API Decisions: Stakeholder Handoff

Written for the coaching staff and the hockey data provider's integration team. This memo summarizes what was decided, what was built, and what comes next.

## What we set out to do

The coaching staff asked for a way to submit player evaluation forms after practice. A third-party hockey data provider needs to push live game events (goals, assists, penalties, saves, shots) into the app as games happen. Before building screens or storage, we needed to agree on what data goes where, how the app accepts or rejects it, and who is responsible for each piece.

Sources: [docs/scoping/client-story-brief.md](../scoping/client-story-brief.md)

## What we delivered

Each file below is tied to a stakeholder outcome:

| File | What it does | Who benefits |
|---|---|---|
| `docs/scoping/client-story-brief.md` | Captures the original request from the coaching staff and provider | Everyone: prevents solving the wrong problem |
| `docs/scoping/resource-inventory.md` | Names every actor, resource, workflow state, and system boundary | Team: ensures no one is forgotten |
| `docs/api/resource-design.md` | Lists the two endpoints and what each caller is allowed to do | Provider and coach: clear scope of what the API accepts |
| `docs/api/error-and-status-model.md` | Defines every status code and the shared error format | Provider's integration code and coach's form: predictable error handling |
| `openapi/hockey-ingestion.yaml` | Machine-readable contract both sides can build against | Provider: can auto-generate client code; Team: can validate server code |
| `src/server/validation/*.ts` | Server-side validation that never trusts the client | Coaching staff: bad data never gets stored silently |
| `src/routes/api/events.ts` | Route handler for `POST /api/events` | Provider: a working doorway to push events |
| `src/routes/api/evaluations.ts` | Route handler for `POST /api/evaluations` | Coach: a working doorway to submit evaluations |
| `docs/api/acceptance-criteria.md` | Checklist proving the API does what was promised | Everyone: verifiable proof the agreement is kept |
| `tests/api/ingestion-validation.test.ts` | Automated tests that confirm valid data is accepted and bad data is rejected with field-level errors | Team: prevents regressions when code changes |

## Decisions made

### Resources and methods

- **Game events** are stored at `POST /api/events`. The provider pushes one event at a time. The path is a noun ("events"), not a verb.
- **Evaluations** are stored at `POST /api/evaluations`. The coach submits one form at a time. When authentication is added, coach_id will come from the authenticated session, never from the form itself.
- Read operations (GET) are not in scope yet. They were deferred until the inventory explicitly authorizes them.

### Error format

- Every failure returns the same JSON shape: `error.code` (machine-readable), `error.message` (human-readable), and `error.details` (array of field-level problems).
- A validation failure is `422`, not `200` with a hidden error. Unparseable JSON is `400`. Duplicate provider events are `409`.
- The provider's integration code and the coach's form can both parse errors the same way.

### What was deferred

- **Authentication:** How the server verifies the provider or coach identity (API keys, tokens). Status codes 401 and 403 are defined but not enforced yet.
- **Persistence:** Events and evaluations are validated but stored as stubs. Database tables come in a later sprint.
- **Event corrections:** Whether the provider can update a previously accepted event (open question from the brief).
- **Draft evaluations:** Whether a coach can save a partial form and finish later (open question from the brief).
- **Bulk ingestion:** A batch endpoint for multiple events at once (not in the client story).
- **Read endpoints:** GET for listing or fetching individual events and evaluations.

## Who owns what

| Responsibility | Owner |
|---|---|
| Coach types a rating and notes into the evaluation form | **Frontend** (browser screens; the frontend shows server field errors from the details array; a browser check is never final) |
| Provider sends event data as JSON | **Provider's system** (no screen, machine-to-machine) |
| Validate every field before anything is stored | **Backend API** (server-side, never the browser) |
| Store accepted events and evaluations | **Database** (not yet implemented; unidentified writes must not be stored, so identity must be verified before persistence is added) |
| Decide playing time based on evaluations | **Head coach** (human judgment, not software) |
| Review submitted evaluations | **Head coach** (software records the review, does not make the decision) |
| Verify the provider is who they claim to be | **Backend API** (mechanism TBD; must be resolved before persistence) |

## Open questions for the next sprint

These are questions, not decisions. The next sprint must answer them before building.

1. **How does the provider prove identity?** API key in a header? Shared secret? OAuth token? Until this is answered, unidentified writes must not be stored.
2. **How long are evaluations kept?** Indefinitely? Archived after the season? This affects storage and retention policy.
3. **Can the provider correct a previously accepted event?** If yes, what identifies the original, and does the correction replace it or create a new version?
4. **Can a coach save a partial evaluation and finish later?** If yes, the form needs a draft state and the validation rules change for incomplete submissions.
5. **Will the coaching staff need to search or filter stored events and evaluations?** If yes, GET endpoints need to be added to the contract.

## What the next sprint should build against

The OpenAPI contract (`openapi/hockey-ingestion.yaml`) is the single source of truth. Identity must be resolved first, then persistence, in that order. Unidentified writes must not reach the database.

Nothing in the next sprint should change the paths, methods, status codes, or error shape without updating the contract first.

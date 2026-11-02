# Resource Inventory: Hockey Event Ingestion and Coach Evaluations

Source: [docs/scoping/client-story-brief.md](./client-story-brief.md)

## Actors

| Actor | Type | Goal |
|---|---|---|
| Third-party hockey data provider | Outside automated system | Push game events into the app reliably and receive confirmation or structured rejection |
| Coach | Internal human user | Submit a player evaluation form after practice and see clear errors if something is missing |
| Head coach | Internal human user | Review submitted evaluations and decide on playing time (human judgment, not software) |
| App server (backend API) | Internal system | Accept valid data, reject invalid data with field-level errors, store accepted records |

## Resource Candidates

| Resource | Description | Created By | Example Fields |
|---|---|---|---|
| Game Event | A single thing that happened in a hockey game: a goal, assist, penalty, save, or shot | Third-party provider pushes it | game_id, event_type, player_id, period, game_clock, provider_event_id |
| Evaluation Form | A coach's written assessment of a player's performance after practice | Coach submits it | game_id, player_id, rating (1-5), notes |

Note: Resources are nouns (things the system stores), not verbs. "Submit" and "push" are actions on these resources, not resources themselves.

## Workflow States

### Game Event

| State | Meaning | Transition |
|---|---|---|
| Received | The provider sent it and the server is checking it | Automatic on arrival |
| Accepted | Validation passed, the event is stored | After server validates all required fields |
| Rejected | Validation failed, the event was not stored | Server returns field-level errors to the provider |

### Evaluation Form

| State | Meaning | Transition |
|---|---|---|
| Draft | The coach started filling out the form but has not submitted (open question: are drafts allowed?) | Coach saves without submitting |
| Submitted | The coach completed and submitted the form | After server validates all required fields |
| Reviewed | The head coach has read the evaluation | Human action, recorded by software but not decided by software |

## Inputs and Outputs

### Game Event Ingestion

- **Inputs from provider:** game_id, event_type, player_id, period, game_clock, provider_event_id, provider_timestamp, details
- **Output on success:** Confirmation that the event was accepted, the stored record
- **Output on failure:** A list of field-level problems (which field failed, why)

### Evaluation Form Submission

- **Inputs from coach:** game_id, player_id, rating, notes
- **Output on success:** Confirmation that the evaluation was saved
- **Output on failure:** A list of field-level problems (which field is missing or invalid)

## System Boundaries

| Job | Owner | Why |
|---|---|---|
| Coach types a rating and notes | **Frontend** (screens) | The coach sees and fills the form |
| Provider sends event data | **Backend API** (no screen, machine-to-machine) | The provider is an outside system, not a person clicking buttons |
| Validate that all required fields are present and correct | **Backend API** | The server must never trust the client. Validation lives on the server, not in the browser |
| Store accepted events and evaluations | **Database** | Long-term storage for records the team decided to keep |
| Decide playing time based on evaluations | **Manual coaching process** | This is a human judgment call. Software records the evaluation but does not decide who plays |
| Review a submitted evaluation | **Manual coaching process** | The head coach reads and judges. Software records that the review happened |
| Identify whether the provider is authorized | **Backend API** | Open question: API key, shared secret, or other mechanism |

## Open Questions (Carried from Brief)

1. **Provider identity:** How does the server verify the provider is who they claim to be?
2. **Event correction:** Can a provider correct an event after it was accepted? If so, what identifies the original?
3. **Draft evaluations:** Can a coach save a partial evaluation and come back later, or must they submit a complete form?

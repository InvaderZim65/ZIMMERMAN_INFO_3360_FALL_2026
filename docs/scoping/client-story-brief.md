# Client Story Brief: Hockey Event Ingestion and Coach Evaluations

## Restated Story

A third-party hockey data provider needs to push live game events (goals, assists, penalties, saves, shots) into the team app as games happen. The provider is an outside company, not part of our team. Separately, coaches need a way to submit player evaluation forms after practice sessions. These are two distinct jobs with different actors, different triggers, and different definitions of success.

## Workflow A: Provider Pushes Game Events

1. **Trigger:** A game is in progress and the provider detects a scoreable event (goal, penalty, save, etc.).
2. **Actor:** The third-party hockey data provider (an automated system).
3. **Action:** The provider sends the event data to our app, including what happened, which player was involved, the period, and the game clock time.
4. **Hand-off:** Our app receives the event, validates it, and stores it.
5. **Success:** The event appears in the app's game record. The provider receives confirmation that the event was accepted. If the data is incomplete or invalid, the provider receives a clear rejection explaining exactly which fields are wrong.

## Workflow B: Coach Submits Player Evaluation

1. **Trigger:** Practice ends and the coach is ready to evaluate player performance.
2. **Actor:** The coach (a human user logged into the app).
3. **Action:** The coach fills out an evaluation form for a specific player in a specific game or practice, including a rating and written notes.
4. **Hand-off:** The app validates the form and stores the evaluation.
5. **Success:** The evaluation is saved and associated with the correct player and game. If the form is incomplete, the coach sees clear field-level messages telling them what to fix before resubmitting.

## Actors

| Actor | Type | Goal | Success Looks Like |
|---|---|---|---|
| Hockey data provider | Third-party automated system | Push game events into the app reliably | Events are accepted with confirmation, or rejected with clear field-level errors. No events are silently lost. |
| Coach | Internal human user | Submit player evaluations after practice | Evaluation is saved for the right player and game. Incomplete forms show exactly which fields need attention. |
| App server | Internal system | Accept valid data, reject invalid data | Valid events and evaluations are stored. Invalid payloads return structured error responses the sender can act on. |

## Success Criteria

- When the provider sends a valid game event, the app stores it and returns confirmation.
- When the provider sends an invalid or incomplete event, the app returns a structured error listing every field that failed and why.
- When a coach submits a complete evaluation form, it is saved and linked to the correct player and game.
- When a coach submits an incomplete form, the response names every missing or invalid field so the coach can fix and resubmit.
- The provider and the coach never see a silent failure. Every submission gets an explicit accept or reject.

## Open Questions (Must Not Skip)

1. **How does the team identify the provider?** The data provider is an outside system. How do we verify that an incoming request is really from our authorized provider and not from an impersonator? This changes whether we need API keys, shared secrets, or something else.
2. **Can a pushed event be corrected after it is accepted?** If the provider sends a goal event and later realizes it was actually an assist, can they send a correction? If so, how does the app know which original event to update? This affects whether events are immutable or editable.
3. **Can a coach save a draft evaluation, or must they submit a complete form?** If drafts are allowed, the validation rules change: a draft can be incomplete, but a final submission cannot. This affects both the form design and the storage model.

## Out of Scope for This Brief

- Screen layouts, wireframes, or UI design.
- Database table names, column types, or storage details.
- URL paths, HTTP status codes, or API design.
- Authentication and authorization implementation.
- How the app displays events or evaluations after they are stored.

These decisions belong in later steps. This brief captures the need, not the build.

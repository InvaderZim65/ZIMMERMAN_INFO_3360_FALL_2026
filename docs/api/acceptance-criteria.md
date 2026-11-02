# Acceptance Criteria: Hockey Event Ingestion and Coach Evaluations

Source: [openapi/hockey-ingestion.yaml](../../openapi/hockey-ingestion.yaml)

All paths, fields, status codes, and error properties below come from the OpenAPI contract. No invented fields.

## Event Ingestion Criteria

### AC-1: Valid event is accepted

- **Given** a POST /events request with all required fields (game_id as UUID, event_type as one of goal/assist/penalty/save/shot, period as integer 1-4, provider_event_id as string)
- **When** the server receives the request
- **Then** it returns 201 Created with the stored event including an id and created_at

### AC-2: Missing required event field is rejected

- **Given** a POST /events request missing provider_event_id
- **When** the server validates the payload
- **Then** it returns 422 with error.code VALIDATION_FAILED and a details entry where field is "provider_event_id" and code is "REQUIRED"

### AC-3: Invalid event_type is rejected

- **Given** a POST /events request where event_type is "touchdown"
- **When** the server validates the payload
- **Then** it returns 422 with error.code VALIDATION_FAILED and a details entry where field is "event_type" and code is "INVALID_VALUE"

### AC-4: Out-of-range period is rejected

- **Given** a POST /events request where period is 7
- **When** the server validates the payload
- **Then** it returns 422 with error.code VALIDATION_FAILED and a details entry where field is "period" and code is "OUT_OF_RANGE"

### AC-5: Unparseable JSON is rejected

- **Given** a POST /events request with a body that is not valid JSON
- **When** the server tries to parse the body
- **Then** it returns 400 with error.code BAD_REQUEST and an empty details array

## Evaluation Submission Criteria

### AC-6: Valid evaluation is accepted

- **Given** a POST /evaluations request with game_id as UUID, player_id as UUID, and rating as integer 1-5
- **When** the server receives the request
- **Then** it returns 201 Created with the stored evaluation including an id, coach_id, and created_at

### AC-7: Missing required evaluation field is rejected

- **Given** a POST /evaluations request missing rating
- **When** the server validates the payload
- **Then** it returns 422 with error.code VALIDATION_FAILED and a details entry where field is "rating" and code is "REQUIRED"

### AC-8: Out-of-range rating is rejected

- **Given** a POST /evaluations request where rating is 0
- **When** the server validates the payload
- **Then** it returns 422 with error.code VALIDATION_FAILED and a details entry where field is "rating" and code is "OUT_OF_RANGE"

### AC-9: Multiple evaluation errors are reported at once

- **Given** a POST /evaluations request missing both player_id and rating
- **When** the server validates the payload
- **Then** it returns 422 with error.code VALIDATION_FAILED and the details array contains entries for both "player_id" and "rating"

## Traceability Table

| AC | Resource | Field(s) Tested | Status | Error Code | Contract Section |
|---|---|---|---|---|---|
| AC-1 | /events | all required | 201 | - | POST /events → 201 |
| AC-2 | /events | provider_event_id | 422 | REQUIRED | POST /events → 422 |
| AC-3 | /events | event_type | 422 | INVALID_VALUE | GameEventInput.event_type enum |
| AC-4 | /events | period | 422 | OUT_OF_RANGE | GameEventInput.period min/max |
| AC-5 | /events | (body) | 400 | BAD_REQUEST | POST /events → 400 |
| AC-6 | /evaluations | all required | 201 | - | POST /evaluations → 201 |
| AC-7 | /evaluations | rating | 422 | REQUIRED | POST /evaluations → 422 |
| AC-8 | /evaluations | rating | 422 | OUT_OF_RANGE | EvaluationInput.rating min/max |
| AC-9 | /evaluations | player_id, rating | 422 | REQUIRED | POST /evaluations → 422 |

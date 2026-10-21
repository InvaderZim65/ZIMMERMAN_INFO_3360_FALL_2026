# Break-tests: who I will pretend to be

Status: not run yet. Do not write pass or fail in this file.

How I filled Expected: I copied allow or deny from docs/access/access-matrix-v2.md. I did not guess.

Rules:
- Use the same role names and data names as the access matrix.
- Do not write passwords, keys, or tokens in this file.
- Test-account secrets are environment variables. Names only, no values.

## Environment variable names (names only)

- Assistant scout email: TEST_ASSISTANT_SCOUT_EMAIL
- Assistant scout password: TEST_ASSISTANT_SCOUT_PASSWORD
- Video analyst email: TEST_VIDEO_ANALYST_EMAIL
- Video analyst password: TEST_VIDEO_ANALYST_PASSWORD
- Medical role email: TEST_MEDICAL_EMAIL
- Medical role password: TEST_MEDICAL_PASSWORD
- Supabase URL: TEST_SUPABASE_URL
- Supabase anon key: TEST_SUPABASE_ANON_KEY

## Required cases

### AS-READ-SCOUT

- Case id: AS-READ-SCOUT
- Actor: assistant_scout
- Action: read
- Target: scouting_events (non-medical rows)
- Expected: allow
- Matrix cell: Assistant scout + Scouting notes = "See and add"
- Why: The assistant scout's primary job is attending games and logging observations, so they must be able to read non-medical scouting events.
- Test name: AS-READ-SCOUT assistant scout can read non-medical scouting events

### AS-READ-GAME

- Case id: AS-READ-GAME
- Actor: assistant_scout
- Action: read
- Target: games
- Expected: allow
- Matrix cell: Assistant scout + Game data = "See only"
- Why: The assistant scout needs the schedule to know when and where to scout.
- Test name: AS-READ-GAME assistant scout can read game data

### VA-READ-SCOUT

- Case id: VA-READ-SCOUT
- Actor: video_analyst
- Action: read
- Target: scouting_events
- Expected: deny
- Matrix cell: Video analyst is absent from the scouting_events_select policy role list
- Why: Video analysts review film, not scouting reports. The database returns zero rows when a video analyst queries scouting_events.
- Test name: VA-READ-SCOUT video analyst cannot read scouting events

### VA-READ-GAME

- Case id: VA-READ-GAME
- Actor: video_analyst
- Action: read
- Target: games
- Expected: allow
- Matrix cell: Video analyst + Game data = "See only"
- Why: Video analysts need game dates and opponents to organize their film review.
- Test name: VA-READ-GAME video analyst can read game data

### AS-READ-MED

- Case id: AS-READ-MED
- Actor: assistant_scout
- Action: read
- Target: player_medical_notes
- Expected: deny
- Matrix cell: Assistant scout + Medical records = "Deny"
- Why: Assistant scouts have no reason to access medical data. Their job is game observation, not player health.
- Test name: AS-READ-MED assistant scout cannot read medical notes

### AS-CHANGE-MED

- Case id: AS-CHANGE-MED
- Actor: assistant_scout
- Action: change (INSERT)
- Target: player_medical_notes
- Expected: deny
- Matrix cell: Assistant scout + Medical records = "Deny"
- Why: Assistant scouts must not be able to create, edit, or delete medical notes. Medical data is owned by medical staff only.
- Test name: AS-CHANGE-MED assistant scout cannot insert medical notes

### AS-READ-SS

- Case id: AS-READ-SS
- Actor: assistant_scout
- Action: read
- Target: scouting_events WHERE is_medical = true (sports-science data)
- Expected: deny
- Matrix cell: Assistant scout + Sports-science data = "Deny"
- Why: Sports-science observations contain injury indicators. The assistant scout's scouting access is limited to non-medical observations only. The RLS compound condition filters these out.
- Test name: AS-READ-SS assistant scout cannot read sports-science scouting events

### AS-CHANGE-SS

- Case id: AS-CHANGE-SS
- Actor: assistant_scout
- Action: change (UPDATE)
- Target: scouting_events WHERE is_medical = true (sports-science data)
- Expected: deny
- Matrix cell: Assistant scout + Sports-science data = "Deny"
- Why: The assistant scout cannot update scouting events at all (only admin and head_coach have UPDATE), and sports-science rows are additionally sealed by the medical filter.
- Test name: AS-CHANGE-SS assistant scout cannot update sports-science scouting events

### VA-READ-MED

- Case id: VA-READ-MED
- Actor: video_analyst
- Action: read
- Target: player_medical_notes
- Expected: deny
- Matrix cell: Video analyst + Medical records = "Deny"
- Why: Video analysts review film, not medical records. No medical data is relevant to their work.
- Test name: VA-READ-MED video analyst cannot read medical notes

### VA-CHANGE-MED

- Case id: VA-CHANGE-MED
- Actor: video_analyst
- Action: change (INSERT)
- Target: player_medical_notes
- Expected: deny
- Matrix cell: Video analyst + Medical records = "Deny"
- Why: Video analysts must not create, edit, or delete medical notes. They have no write access to any table.
- Test name: VA-CHANGE-MED video analyst cannot insert medical notes

### VA-READ-SS

- Case id: VA-READ-SS
- Actor: video_analyst
- Action: read
- Target: scouting_events WHERE is_medical = true (sports-science data)
- Expected: deny
- Matrix cell: Video analyst + Sports-science data = "Deny"
- Why: Video analysts cannot read any scouting events at all (absent from the policy role list), so sports-science rows are also invisible.
- Test name: VA-READ-SS video analyst cannot read sports-science scouting events

### VA-CHANGE-SS

- Case id: VA-CHANGE-SS
- Actor: video_analyst
- Action: change (INSERT)
- Target: scouting_events WHERE is_medical = true (sports-science data)
- Expected: deny
- Matrix cell: Video analyst + Sports-science data = "Deny"
- Why: Video analysts have no INSERT policy on scouting_events, so they cannot create sports-science observations or any scouting events.
- Test name: VA-CHANGE-SS video analyst cannot insert sports-science scouting events

### AS-FLAG-SHARED

- Case id: AS-FLAG-SHARED
- Actor: assistant_scout
- Action: read
- Target: scouting_events_safe (shared scouting view)
- Expected: deny (medical flag absent)
- Matrix cell: Assistant scout + Medical flags in shared scouting views = "Deny"
- Why: The shared scouting view must omit the is_medical column and filter out medical-flagged rows. Even though the assistant scout can open the scouting screen, the medical flag must not appear.
- Test name: AS-FLAG-SHARED assistant scout sees no medical flag in shared scouting view

### VA-FLAG-SHARED

- Case id: VA-FLAG-SHARED
- Actor: video_analyst
- Action: read
- Target: scouting_events_safe (shared scouting view)
- Expected: deny (medical flag absent)
- Matrix cell: Video analyst + Medical flags in shared scouting views = "Deny"
- Why: The shared scouting view must not reveal medical flags to the video analyst. The video analyst gets zero rows from the base table anyway, but the view must still not include the medical flag column.
- Test name: VA-FLAG-SHARED video analyst sees no medical flag in shared scouting view

### MED-READ-MED

- Case id: MED-READ-MED
- Actor: medical_staff
- Action: read
- Target: player_medical_notes
- Expected: allow
- Matrix cell: Medical + Medical records = "See, add, and change"
- Why: This is the control case. If the medical role cannot read medical notes, a bug that hides all medical data from everyone would look like a pass on the deny cases above. This case confirms medical data actually exists and is readable by the role that owns it.
- Test name: MED-READ-MED (control) medical staff can read medical notes

## Additional cases (beyond required list)

### AS-WRITE-SCOUT

- Case id: AS-WRITE-SCOUT
- Actor: assistant_scout
- Action: change (INSERT)
- Target: scouting_events (non-medical)
- Expected: allow
- Matrix cell: Assistant scout + Scouting notes = "See and add"
- Why: The assistant scout must be able to log new scouting observations during games. If INSERT is blocked, the role cannot do its job.
- Test name: AS-WRITE-SCOUT assistant scout can insert non-medical scouting events

### VA-WRITE-GAME

- Case id: VA-WRITE-GAME
- Actor: video_analyst
- Action: change (INSERT)
- Target: games
- Expected: deny
- Matrix cell: Video analyst + Game data = "See only"
- Why: Video analysts have read-only access to game data. They cannot add, change, or delete game records.
- Test name: VA-WRITE-GAME video analyst cannot insert game records

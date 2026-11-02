-- Sprint 5: Game events and evaluation forms tables.
-- game_events uses an idempotency_key to prevent duplicate ingestion.

CREATE TABLE game_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text UNIQUE NOT NULL,
  provider_id text NOT NULL,
  provider_event_id text NOT NULL,
  game_id uuid NOT NULL REFERENCES games(id),
  event_type text NOT NULL CHECK (event_type IN ('goal', 'assist', 'penalty', 'save', 'shot')),
  player_id uuid REFERENCES players(id),
  period integer NOT NULL CHECK (period BETWEEN 1 AND 4),
  game_clock text,
  details jsonb DEFAULT '{}',
  received_at timestamptz DEFAULT now(),
  provider_timestamp timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE evaluation_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id),
  coach_id uuid NOT NULL,
  player_id uuid NOT NULL REFERENCES players(id),
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for fast idempotency lookups by provider
CREATE INDEX idx_game_events_provider ON game_events (provider_id, provider_event_id);

-- Index for querying events by game
CREATE INDEX idx_game_events_game_id ON game_events (game_id);

-- Index for querying evaluations by game + coach
CREATE INDEX idx_evaluation_forms_game_coach ON evaluation_forms (game_id, coach_id);

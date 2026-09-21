-- supabase/migrations/001_scouting_schema.sql
-- Scouting schema for Northline Hockey.
-- Aligned with docs/scouting-data-requirements.md.

create extension if not exists "pgcrypto";

-- Players: skaters and goalies Northline scouts track
create table if not exists public.players (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null,
  position    text,
  jersey_number integer,
  team_name   text,
  created_at  timestamptz not null default now(),
  constraint players_full_name_not_blank check (char_length(trim(full_name)) > 0)
);

-- Games: contests on a date; scouts attach events to a specific game
create table if not exists public.games (
  id          uuid primary key default gen_random_uuid(),
  opponent    text not null,
  played_on   date not null,
  venue       text,
  is_home     boolean not null default true,
  created_at  timestamptz not null default now(),
  constraint games_opponent_not_blank check (char_length(trim(opponent)) > 0)
);

-- Scouting events: something observed in a game about a player
-- Belongs to exactly one player and exactly one game (foreign keys enforced)
create table if not exists public.scouting_events (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid not null references public.players (id) on delete restrict,
  game_id     uuid not null references public.games (id) on delete restrict,
  event_type  text not null,
  period      smallint,
  clock_seconds integer,
  notes       text,
  created_at  timestamptz not null default now(),
  constraint scouting_events_event_type_not_blank check (char_length(trim(event_type)) > 0)
);

-- Indexes for scout list/filter performance
create index if not exists scouting_events_player_id_idx
  on public.scouting_events (player_id);

create index if not exists scouting_events_game_id_idx
  on public.scouting_events (game_id);

create index if not exists games_played_on_idx
  on public.games (played_on);

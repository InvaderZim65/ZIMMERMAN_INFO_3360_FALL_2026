-- supabase/migrations/002_scouting_aggregates_rpc.sql
-- Scout question: for a given game, how many events of each type (and total) per player?

CREATE OR REPLACE FUNCTION public.player_event_counts_for_game(p_game_id uuid)
RETURNS TABLE (
  player_id uuid,
  player_name text,
  event_count bigint,
  goal_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    p.id        AS player_id,
    p.full_name AS player_name,
    COUNT(se.id)::bigint AS event_count,
    COUNT(se.id) FILTER (WHERE se.event_type = 'goal')::bigint AS goal_count
  FROM public.players p
  INNER JOIN public.scouting_events se
    ON se.player_id = p.id
  WHERE se.game_id = p_game_id
  GROUP BY p.id, p.full_name
  ORDER BY event_count DESC, p.full_name ASC;
$$;

GRANT EXECUTE ON FUNCTION public.player_event_counts_for_game(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.player_event_counts_for_game(uuid) TO service_role;

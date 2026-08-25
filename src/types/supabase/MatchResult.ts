// Snapshot of a finished match (table public.match_results).
export type MatchResult = {
  id: string;
  game_id: string;
  room_code: string | null;
  room_name: string | null;
  host_id: string | null;
  members: string[];
  winner_id: string | null;
  game_mode: "1vs1" | "team" | string;
  finished_at: string;
  created_at: string;
};

// 2. Trận đấu (Game)
export interface Game {
  id: string; // UUID
  player_1: string | null; // Zalo ID
  player_2: string | null; // Zalo ID
  status: "waiting" | "playing" | "finished";
  current_turn: string | null; // Zalo ID của người đến lượt
  winner_id: string | null;
  created_at: string;
}

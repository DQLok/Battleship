// 4. Lượt bắn (Move)
export interface Move {
  id: string;
  game_id: string;
  user_id: string;
  x: number;
  y: number;
  is_hit: boolean;
  created_at: string;
}

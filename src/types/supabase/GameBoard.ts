// 3. Bàn cờ (Game Board)
export interface GameBoard {
  id: string;
  game_id: string;
  user_id: string;
  ships_data: Ship[]; // Dữ liệu JSONB đã parse
  hits_taken: Coordinate[]; // Các tọa độ đã bị đối phương bắn trúng
  is_ready: boolean;
  updated_at: string;
}

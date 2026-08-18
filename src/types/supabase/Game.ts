// 2. Trận đấu (Game) - Cấu trúc Mới
export interface Game {
  id: string; // UUID
  room_name: string; // Tên phòng hiển thị
  host_id: string | null; // Telegram user ID of room host

  // Telegram user IDs of all players in the room
  // Dùng mảng giúp bạn mở rộng số lượng người chơi dễ dàng (ví dụ: 1vs1, 2vs2 hoặc chơi 4 người)
  members: string[];

  status: "waiting" | "playing" | "finished";
  current_turn: string | null; // Telegram user ID of active player
  winner_id: string | null;
  created_at: string; // ISO Timestamp (Asia/Ho_Chi_Minh)
  game_mode: "1vs1" | "team";
  ready_members: string[];
}

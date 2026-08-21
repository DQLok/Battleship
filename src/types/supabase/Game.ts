// 2. Trận đấu (Game) - Cấu trúc Mới
export interface Game {
  id: string; // UUID
  room_name: string; // Tên phòng hiển thị
  room_code?: string | null;
  // Telegram user ID or web guest id (`guest_*`)
  host_id: string | null;

  members: string[];

  /** waiting = phòng chờ; setup = dàn tàu; playing = đang bắn; finished = xong */
  status: "waiting" | "setup" | "playing" | "finished";
  current_turn: string | null; // same player id as members[]
  winner_id: string | null;
  disconnected_user_id?: string | null;
  reconnect_until?: string | null;
  created_at: string; // ISO Timestamp (Asia/Ho_Chi_Minh)
  game_mode: "1vs1" | "team";
  ready_members: string[];
}

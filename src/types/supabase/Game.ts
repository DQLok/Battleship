// 2. Trận đấu (Game) - Cấu trúc Mới
export interface Game {
  id: string; // UUID
  room_name: string; // Tên phòng hiển thị
  host_id: string | null; // Zalo ID của chủ phòng (thay cho player_1)

  // Danh sách Zalo ID của tất cả người chơi trong phòng
  // Dùng mảng giúp bạn mở rộng số lượng người chơi dễ dàng (ví dụ: 1vs1, 2vs2 hoặc chơi 4 người)
  members: string[];

  status: "waiting" | "playing" | "finished";
  current_turn: string | null; // Zalo ID của người đến lượt
  winner_id: string | null;
  created_at: string; // ISO Timestamp (Asia/Ho_Chi_Minh)
}

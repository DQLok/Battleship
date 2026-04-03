// 1. Profile người dùng
export interface Profile {
  id: string; // Zalo ID
  username: string | null;
  avatar_url: string | null;
  wins: number;
  updated_at: string; // ISO String từ TIMESTAMPTZ
}

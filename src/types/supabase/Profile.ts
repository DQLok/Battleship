// 1. Profile người dùng
export interface Profile {
  id: string; // Player id (Meta getID or local session)
  username: string | null;
  avatar_url: string | null;
  wins: number;
  updated_at: string; // ISO String từ TIMESTAMPTZ
  created_at: string;
  total_games: number;  
}

// 1. Profile người dùng
export interface Profile {
  id: string; // Primary key used by games/members
  telegram_id?: string | null;
  username: string | null;
  avatar_url: string | null;
  first_name?: string | null;
  last_name?: string | null;
  telegram_username?: string | null;
  language_code?: string | null;
  is_premium?: boolean | null;
  allows_write_to_pm?: boolean | null;
  wins: number;
  updated_at: string; // ISO String từ TIMESTAMPTZ
  created_at: string;
  total_games: number;
}

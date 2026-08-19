-- Public Telegram Mini App user fields (from initData.user).
-- Does not store phone, initData hash, or other non-public data.

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists telegram_username text,
  add column if not exists language_code text,
  add column if not exists is_premium boolean,
  add column if not exists allows_write_to_pm boolean;

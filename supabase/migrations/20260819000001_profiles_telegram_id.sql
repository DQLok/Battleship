-- Lookup key for Mini App users. Existing rows copy id → telegram_id.

alter table public.profiles
  add column if not exists telegram_id text;

update public.profiles
  set telegram_id = id
  where telegram_id is null;

create unique index if not exists profiles_telegram_id_uidx
  on public.profiles (telegram_id)
  where telegram_id is not null;

-- Room invite codes + allow guest session ids (localStorage) in gameplay.
-- Guests are not stored in profiles.

alter table public.games
  add column if not exists room_code text;

alter table public.games drop constraint if exists games_host_id_fkey;
alter table public.games drop constraint if exists games_current_turn_fkey;
alter table public.games drop constraint if exists games_winner_id_fkey;
alter table public.game_boards drop constraint if exists game_boards_user_id_fkey;
alter table public.moves drop constraint if exists moves_user_id_fkey;

update public.games
  set room_code = upper(substr(md5(id::text), 1, 6))
  where room_code is null;

create unique index if not exists games_room_code_uidx
  on public.games (room_code)
  where room_code is not null;

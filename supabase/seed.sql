-- Dev seed data for local Telegram Mini App testing

insert into public.profiles (id, telegram_id, username, avatar_url, wins, total_games)
values
  ('1', '1', 'commander', '', 3, 10),
  ('2', '2', 'admiral_bot', '', 1, 5),
  ('mock-player-2', 'mock-player-2', 'Player_mock-player-2', '', 0, 0)
on conflict (id) do update set
  telegram_id = excluded.telegram_id,
  username = excluded.username,
  updated_at = now();

insert into public.games (room_name, host_id, members, status, game_mode)
select 'Dev Room Alpha', '1', array['1'], 'waiting', '1vs1'
where not exists (
  select 1 from public.games where room_name = 'Dev Room Alpha'
);

insert into public.games (room_name, host_id, members, status, game_mode)
select 'Dev Room Beta', '2', array['2'], 'waiting', 'team'
where not exists (
  select 1 from public.games where room_name = 'Dev Room Beta'
);

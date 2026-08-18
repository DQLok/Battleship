-- Battleship schema for Telegram Mini App
-- User IDs are Telegram user IDs (text), not Supabase auth UUIDs.

create extension if not exists "pgcrypto";

-- ──────────────────────────────────────────────
-- PROFILES
-- ──────────────────────────────────────────────
create table if not exists public.profiles (
  id          text primary key,
  username    text,
  avatar_url  text,
  wins        integer not null default 0,
  total_games integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- GAMES (rooms / match state)
-- ──────────────────────────────────────────────
create table if not exists public.games (
  id            uuid primary key default gen_random_uuid(),
  room_name     text not null default 'BattleShip',
  host_id       text references public.profiles(id) on delete set null,
  members       text[] not null default '{}',
  status        text not null default 'waiting'
                  check (status in ('waiting', 'playing', 'finished')),
  current_turn  text references public.profiles(id),
  winner_id     text references public.profiles(id),
  game_mode     text not null default '1vs1'
                  check (game_mode in ('1vs1', 'team')),
  ready_members text[] not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index if not exists unique_waiting_room_per_user
  on public.games (host_id) where status = 'waiting';

-- ──────────────────────────────────────────────
-- GAME BOARDS (ship placement per player)
-- ──────────────────────────────────────────────
create table if not exists public.game_boards (
  id         uuid primary key default gen_random_uuid(),
  game_id    uuid not null references public.games(id) on delete cascade,
  user_id    text not null references public.profiles(id) on delete cascade,
  ships_data jsonb not null default '[]'::jsonb,
  hits_taken jsonb not null default '[]'::jsonb,
  is_ready   boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (game_id, user_id)
);

-- ──────────────────────────────────────────────
-- MOVES (attack history)
-- ──────────────────────────────────────────────
create table if not exists public.moves (
  id             uuid primary key default gen_random_uuid(),
  game_id        uuid not null references public.games(id) on delete cascade,
  user_id        text not null references public.profiles(id) on delete cascade,
  x              integer not null check (x >= 0 and x < 10),
  y              integer not null check (y >= 0 and y < 10),
  is_hit         boolean not null default false,
  sunk_ship_name text,
  created_at     timestamptz not null default now()
);

-- ──────────────────────────────────────────────
-- INDEXES
-- ──────────────────────────────────────────────
create index if not exists idx_games_status_created on public.games (status, created_at desc);
create index if not exists idx_game_boards_game_id  on public.game_boards (game_id);
create index if not exists idx_moves_game_id        on public.moves (game_id);

-- ──────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- Telegram Mini App uses anon key; server validates initData.
-- Open policies for dev; tighten for production via Edge Functions.
-- ──────────────────────────────────────────────
alter table public.profiles    enable row level security;
alter table public.games       enable row level security;
alter table public.game_boards enable row level security;
alter table public.moves       enable row level security;

create policy "anon_profiles_all"    on public.profiles    for all using (true) with check (true);
create policy "anon_games_all"       on public.games       for all using (true) with check (true);
create policy "anon_game_boards_all" on public.game_boards for all using (true) with check (true);
create policy "anon_moves_all"       on public.moves       for all using (true) with check (true);

-- ──────────────────────────────────────────────
-- GRANTS
-- ──────────────────────────────────────────────
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables    in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant execute on all functions in schema public to anon, authenticated, service_role;

-- ──────────────────────────────────────────────
-- REALTIME
-- ──────────────────────────────────────────────
alter publication supabase_realtime add table public.games;
alter publication supabase_realtime add table public.game_boards;
alter publication supabase_realtime add table public.moves;

-- ──────────────────────────────────────────────
-- RPC functions & triggers for the Battleship client
-- ──────────────────────────────────────────────

-- check_move_logic: BEFORE INSERT trigger on moves
-- Determines hit/miss AND detects if the hit sinks a ship.
create or replace function public.check_move_logic()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  opp_ships jsonb;
  ship record;
  is_hit_res boolean := false;
  is_sunk boolean := true;
  i int;
  sx int; sy int;
begin
  select ships_data into opp_ships
  from public.game_boards
  where game_id = NEW.game_id and user_id != NEW.user_id
  limit 1;

  for ship in
    select * from jsonb_to_recordset(opp_ships)
      as x(size int, x int, y int, "isHorizontal" boolean, name text)
  loop
    is_hit_res := false;
    for i in 0..(ship.size - 1) loop
      sx := case when ship."isHorizontal" then ship.x + i else ship.x end;
      sy := case when ship."isHorizontal" then ship.y else ship.y + i end;
      if (sx = NEW.x and sy = NEW.y) then is_hit_res := true; end if;
    end loop;

    if is_hit_res then
      NEW.is_hit := true;
      is_sunk := true;

      for i in 0..(ship.size - 1) loop
        sx := case when ship."isHorizontal" then ship.x + i else ship.x end;
        sy := case when ship."isHorizontal" then ship.y else ship.y + i end;

        if not (sx = NEW.x and sy = NEW.y) and not exists (
          select 1 from public.moves
          where game_id = NEW.game_id and user_id = NEW.user_id
            and x = sx and y = sy and is_hit = true
        ) then
          is_sunk := false;
        end if;
      end loop;

      if is_sunk then
        NEW.sunk_ship_name := ship.name;
      end if;

      return NEW;
    end if;
  end loop;

  NEW.is_hit := false;
  return NEW;
end;
$$;

create trigger trigger_check_hit
  before insert on public.moves
  for each row execute function public.check_move_logic();

-- join_game_room: add a player to a room (idempotent)
create or replace function public.join_game_room(room_id uuid, new_user_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.games
  set members = array_append(members, new_user_id)
  where id = room_id
    and not (members @> array[new_user_id]);
end;
$$;

-- finish_game: end match, update stats, clean up temp data
create or replace function public.finish_game(p_game_id uuid, p_winner_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  player_ids text[];
begin
  select array_agg(user_id) into player_ids
  from public.game_boards where game_id = p_game_id;

  -- Increase total_games for all participants
  update public.profiles
  set total_games = total_games + 1,
      updated_at = now()
  where id = any(player_ids);

  -- Increase wins for the winner
  if p_winner_id is not null then
    update public.profiles
    set wins = wins + 1
    where id = p_winner_id;
  end if;

  -- Mark game as finished
  update public.games
  set winner_id = p_winner_id,
      status = 'finished',
      updated_at = now()
  where id = p_game_id;

  -- Clean up temporary game data
  delete from public.moves where game_id = p_game_id;
  delete from public.game_boards where game_id = p_game_id;
end;
$$;

-- Grants for RPCs (needed because these functions are created after the
-- generic "grant execute on all functions" earlier in the migration).
grant execute on function public.check_move_logic() to anon, authenticated, service_role;
grant execute on function public.join_game_room(uuid, text) to anon, authenticated, service_role;
grant execute on function public.finish_game(uuid, text) to anon, authenticated, service_role;

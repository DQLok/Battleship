-- Snapshot match results when a game finishes (separate from live `games` row).
-- Cleanup TTL: game_lifecycle.match_results_ttl (~6 months).

create table if not exists public.match_results (
  id          uuid primary key default gen_random_uuid(),
  game_id     uuid not null,
  room_code   text,
  room_name   text,
  host_id     text,
  members     text[] not null default '{}',
  winner_id   text,
  game_mode   text not null default '1vs1',
  finished_at timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create index if not exists match_results_finished_at_idx
  on public.match_results (finished_at desc);

create index if not exists match_results_game_id_idx
  on public.match_results (game_id);

create unique index if not exists match_results_game_id_uidx
  on public.match_results (game_id);

alter table public.match_results enable row level security;

drop policy if exists "anon_match_results_select" on public.match_results;
create policy "anon_match_results_select"
  on public.match_results for select using (true);

grant select on public.match_results to anon, authenticated, service_role;
grant all on public.match_results to service_role;

-- ~6 months (180 days) in seconds
insert into public.game_lifecycle (key, value, unit, description) values
  (
    'match_results_ttl',
    15552000,
    'seconds',
    'Xóa match_results quá hạn (~6 tháng / 180 ngày)'
  )
on conflict (key) do update
  set value = excluded.value,
      unit = excluded.unit,
      description = excluded.description,
      updated_at = now();

create or replace function public.finish_game(p_game_id uuid, p_winner_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  player_ids text[];
  cur_status text;
  g public.games%rowtype;
begin
  select * into g
  from public.games
  where id = p_game_id
  for update;

  if not found then
    return;
  end if;

  if g.status = 'finished' then
    return;
  end if;

  select array_agg(user_id) into player_ids
  from public.game_boards where game_id = p_game_id;

  update public.profiles
  set total_games = total_games + 1,
      updated_at = now()
  where id = any(player_ids);

  if p_winner_id is not null then
    update public.profiles
    set wins = wins + 1
    where id = p_winner_id;
  end if;

  update public.games
  set winner_id = p_winner_id,
      status = 'finished',
      disconnected_user_id = null,
      reconnect_until = null,
      updated_at = now()
  where id = p_game_id;

  insert into public.match_results (
    game_id,
    room_code,
    room_name,
    host_id,
    members,
    winner_id,
    game_mode,
    finished_at
  )
  values (
    g.id,
    g.room_code,
    g.room_name,
    g.host_id,
    coalesce(g.members, '{}'::text[]),
    p_winner_id,
    coalesce(g.game_mode, '1vs1'),
    now()
  )
  on conflict (game_id) do nothing;

  delete from public.moves where game_id = p_game_id;
  delete from public.game_boards where game_id = p_game_id;
end;
$$;

create or replace function public.cleanup_stale_games()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  waiting_ttl bigint := public.game_lifecycle_get('waiting_ttl', 86400);
  setup_ttl bigint := public.game_lifecycle_get('setup_ttl', 21600);
  finished_guest_ttl bigint := public.game_lifecycle_get('finished_guest_ttl', 86400);
  match_results_ttl bigint := public.game_lifecycle_get('match_results_ttl', 15552000);
  deleted_waiting int := 0;
  deleted_setup int := 0;
  deleted_finished int := 0;
  deleted_match_results int := 0;
begin
  with d as (
    delete from public.games
    where status = 'waiting'
      and updated_at < now() - make_interval(secs => waiting_ttl)
    returning 1
  )
  select count(*)::int into deleted_waiting from d;

  with d as (
    delete from public.games
    where status = 'setup'
      and updated_at < now() - make_interval(secs => setup_ttl)
    returning 1
  )
  select count(*)::int into deleted_setup from d;

  with d as (
    delete from public.games
    where status = 'finished'
      and updated_at < now() - make_interval(secs => finished_guest_ttl)
      and exists (
        select 1
        from unnest(coalesce(members, '{}'::text[])) as m(id)
        where m.id like 'guest_%'
      )
    returning 1
  )
  select count(*)::int into deleted_finished from d;

  with d as (
    delete from public.match_results
    where finished_at < now() - make_interval(secs => match_results_ttl)
    returning 1
  )
  select count(*)::int into deleted_match_results from d;

  return jsonb_build_object(
    'deleted_waiting', deleted_waiting,
    'deleted_setup', deleted_setup,
    'deleted_finished_guest', deleted_finished,
    'deleted_match_results', deleted_match_results,
    'waiting_ttl', waiting_ttl,
    'setup_ttl', setup_ttl,
    'finished_guest_ttl', finished_guest_ttl,
    'match_results_ttl', match_results_ttl
  );
end;
$$;

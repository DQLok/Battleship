-- TTL theo status (tách key); bỏ match_results_ttl.
-- Xóa games → cascade xóa match_results. Catch-all games_ttl = 1 tháng.

-- 2 ngày / 7 ngày / 1 tháng (seconds)
-- waiting/setup/playing: 172800 (2d)
-- finished: 604800 (7d)
-- games_ttl: 2592000 (~30d)

delete from public.game_lifecycle where key in ('match_results_ttl', 'finished_guest_ttl');

insert into public.game_lifecycle (key, value, unit, description) values
  ('waiting_ttl', 172800, 'seconds', 'Xóa waiting nếu không update (2 ngày)'),
  ('setup_ttl', 172800, 'seconds', 'Xóa setup nếu không update (2 ngày)'),
  ('playing_ttl', 172800, 'seconds', 'Xóa playing nếu không update (2 ngày)'),
  ('finished_ttl', 604800, 'seconds', 'Xóa finished nếu không update (7 ngày)'),
  ('games_ttl', 2592000, 'seconds', 'Xóa mọi games nếu không update (~1 tháng); kèm match_results')
on conflict (key) do update
  set value = excluded.value,
      unit = excluded.unit,
      description = excluded.description,
      updated_at = now();

-- Orphan lịch sử (phòng đã mất) rồi gắn FK cascade.
delete from public.match_results mr
where not exists (select 1 from public.games g where g.id = mr.game_id);

alter table public.match_results
  drop constraint if exists match_results_game_id_fkey;

alter table public.match_results
  add constraint match_results_game_id_fkey
  foreign key (game_id) references public.games(id) on delete cascade;

create or replace function public.cleanup_stale_games()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  waiting_ttl bigint := public.game_lifecycle_get('waiting_ttl', 172800);
  setup_ttl bigint := public.game_lifecycle_get('setup_ttl', 172800);
  playing_ttl bigint := public.game_lifecycle_get('playing_ttl', 172800);
  finished_ttl bigint := public.game_lifecycle_get('finished_ttl', 604800);
  games_ttl bigint := public.game_lifecycle_get('games_ttl', 2592000);
  deleted_waiting int := 0;
  deleted_setup int := 0;
  deleted_playing int := 0;
  deleted_finished int := 0;
  deleted_inactive int := 0;
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
    where status = 'playing'
      and updated_at < now() - make_interval(secs => playing_ttl)
    returning 1
  )
  select count(*)::int into deleted_playing from d;

  with d as (
    delete from public.games
    where status = 'finished'
      and updated_at < now() - make_interval(secs => finished_ttl)
    returning 1
  )
  select count(*)::int into deleted_finished from d;

  -- Catch-all: mọi status không update quá games_ttl (~1 tháng)
  with d as (
    delete from public.games
    where updated_at < now() - make_interval(secs => games_ttl)
    returning 1
  )
  select count(*)::int into deleted_inactive from d;

  -- match_results theo ON DELETE CASCADE từ games

  return jsonb_build_object(
    'deleted_waiting', deleted_waiting,
    'deleted_setup', deleted_setup,
    'deleted_playing', deleted_playing,
    'deleted_finished', deleted_finished,
    'deleted_inactive_games', deleted_inactive,
    'waiting_ttl', waiting_ttl,
    'setup_ttl', setup_ttl,
    'playing_ttl', playing_ttl,
    'finished_ttl', finished_ttl,
    'games_ttl', games_ttl
  );
end;
$$;

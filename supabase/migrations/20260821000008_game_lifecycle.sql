-- Schedule `game_lifecycle`: vòng đời phòng (TTL, reconnect, cap 1vs1).
-- Cột `value` luôn hiểu là giây với key thời gian; `max_members_1vs1` là số người.

create table if not exists public.game_lifecycle (
  key         text primary key,
  value       bigint not null,
  description text,
  updated_at  timestamptz not null default now()
);

alter table public.game_lifecycle enable row level security;

drop policy if exists "anon_game_lifecycle_select" on public.game_lifecycle;
create policy "anon_game_lifecycle_select"
  on public.game_lifecycle for select using (true);

grant select on public.game_lifecycle to anon, authenticated, service_role;
grant all on public.game_lifecycle to service_role;

insert into public.game_lifecycle (key, value, description) values
  ('reconnect_grace', 30, 'Chờ reconnect khi out giữa playing'),
  ('presence_away', 20, 'Mất tín hiệu đối thủ trước khi xử lý'),
  ('waiting_ttl', 86400, 'Xóa phòng waiting quá hạn'),
  ('setup_ttl', 21600, 'Xóa phòng setup treo'),
  ('finished_guest_ttl', 86400, 'Xóa finished có guest_*'),
  ('max_members_1vs1', 2, 'Tối đa người trong phòng 1vs1 (không phải giây)')
on conflict (key) do update
  set value = excluded.value,
      description = excluded.description,
      updated_at = now();

create or replace function public.game_lifecycle_get(p_key text, p_default bigint)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select value from public.game_lifecycle where key = p_key),
    p_default
  );
$$;

grant execute on function public.game_lifecycle_get(text, bigint) to anon, authenticated, service_role;

-- Dọn phòng theo TTL trong game_lifecycle (gọi từ cron / manual).
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
  deleted_waiting int := 0;
  deleted_setup int := 0;
  deleted_finished int := 0;
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

  return jsonb_build_object(
    'deleted_waiting', deleted_waiting,
    'deleted_setup', deleted_setup,
    'deleted_finished_guest', deleted_finished,
    'waiting_ttl', waiting_ttl,
    'setup_ttl', setup_ttl,
    'finished_guest_ttl', finished_guest_ttl
  );
end;
$$;

grant execute on function public.cleanup_stale_games() to anon, authenticated, service_role;

-- Default reconnect grace đọc từ schedule (fallback 30).
create or replace function public.request_leave_with_reconnect(
  p_game_id uuid,
  p_user_id text,
  p_grace_seconds int default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  grace int;
begin
  grace := coalesce(
    p_grace_seconds,
    public.game_lifecycle_get('reconnect_grace', 30)::int
  );

  update public.games
  set
    disconnected_user_id = p_user_id,
    reconnect_until = now() + make_interval(secs => greatest(grace, 1)),
    updated_at = now()
  where id = p_game_id
    and status = 'playing'
    and p_user_id = any(members);
end;
$$;

-- Cap 1vs1 đọc từ schedule.
create or replace function public.join_game_room(room_id uuid, new_user_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.games%rowtype;
  members_count int;
  max_1vs1 bigint := public.game_lifecycle_get('max_members_1vs1', 2);
begin
  select * into g
  from public.games
  where id = room_id
  for update;

  if not found then
    raise exception 'room_not_found';
  end if;

  if g.host_id = new_user_id or (g.members @> array[new_user_id]) then
    return;
  end if;

  if g.status is distinct from 'waiting' then
    raise exception 'Phòng đã bắt đầu (đang dàn trận hoặc chiến đấu).';
  end if;

  members_count := coalesce(array_length(g.members, 1), 0);

  if coalesce(g.game_mode, '1vs1') = '1vs1' and members_count >= max_1vs1 then
    raise exception 'Phòng (1vs1) đã đủ % người.', max_1vs1;
  end if;

  update public.games
  set members = array_append(members, new_user_id)
  where id = room_id
    and not (members @> array[new_user_id]);
end;
$$;

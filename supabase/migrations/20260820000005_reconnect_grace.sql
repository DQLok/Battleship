-- Grace period after voluntary leave during playing: allow reconnect before forfeit.

alter table public.games
  add column if not exists disconnected_user_id text,
  add column if not exists reconnect_until timestamptz;

create or replace function public.request_leave_with_reconnect(
  p_game_id uuid,
  p_user_id text,
  p_grace_seconds int default 30
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.games
  set
    disconnected_user_id = p_user_id,
    reconnect_until = now() + make_interval(secs => greatest(p_grace_seconds, 1)),
    updated_at = now()
  where id = p_game_id
    and status = 'playing'
    and p_user_id = any(members);
end;
$$;

create or replace function public.reconnect_to_game(p_game_id uuid, p_user_id text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  ok boolean := false;
begin
  update public.games
  set
    disconnected_user_id = null,
    reconnect_until = null,
    updated_at = now()
  where id = p_game_id
    and disconnected_user_id = p_user_id
    and reconnect_until > now()
    and p_user_id = any(members);

  ok := found;
  return ok;
end;
$$;

create or replace function public.finalize_disconnected_leave(
  p_game_id uuid,
  p_force boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  leaving_id text;
  until_ts timestamptz;
begin
  select disconnected_user_id, reconnect_until
    into leaving_id, until_ts
  from public.games
  where id = p_game_id
  for update;

  if leaving_id is null then
    return;
  end if;

  if not p_force and until_ts > now() then
    return;
  end if;

  update public.games
  set disconnected_user_id = null, reconnect_until = null
  where id = p_game_id;

  perform public.forfeit_game_on_leave(p_game_id);
  perform public.leave_game_room(p_game_id, leaving_id);

  update public.games
  set
    status = 'waiting',
    current_turn = null,
    winner_id = null,
    ready_members = '{}',
    disconnected_user_id = null,
    reconnect_until = null,
    updated_at = now()
  where id = p_game_id;
end;
$$;

grant execute on function public.request_leave_with_reconnect(uuid, text, int) to anon, authenticated, service_role;
grant execute on function public.reconnect_to_game(uuid, text) to anon, authenticated, service_role;
grant execute on function public.finalize_disconnected_leave(uuid, boolean) to anon, authenticated, service_role;

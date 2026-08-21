-- Add games.status = 'setup' (ship placement after host starts, before combat).
-- Flow: waiting → setup → playing → finished

alter table public.games
  drop constraint if exists games_status_check;

alter table public.games
  add constraint games_status_check
  check (status in ('waiting', 'setup', 'playing', 'finished'));

-- New members may only join while waiting. setup/playing: existing members only (idempotent).
create or replace function public.join_game_room(room_id uuid, new_user_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.games%rowtype;
  members_count int;
begin
  select * into g
  from public.games
  where id = room_id
  for update;

  if not found then
    raise exception 'room_not_found';
  end if;

  -- Idempotent: if user is already host/member, do nothing (reconnect / re-enter).
  if g.host_id = new_user_id or (g.members @> array[new_user_id]) then
    return;
  end if;

  if g.status is distinct from 'waiting' then
    raise exception 'Phòng đã bắt đầu (đang dàn trận hoặc chiến đấu).';
  end if;

  members_count := coalesce(array_length(g.members, 1), 0);

  if coalesce(g.game_mode, '1vs1') = '1vs1' and members_count >= 2 then
    raise exception 'Phòng (1vs1) đã đủ 2 người.';
  end if;

  update public.games
  set members = array_append(members, new_user_id)
  where id = room_id
    and not (members @> array[new_user_id]);
end;
$$;

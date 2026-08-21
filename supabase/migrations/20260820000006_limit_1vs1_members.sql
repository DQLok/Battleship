-- Enforce max members for 1vs1 rooms (2 players).
-- Prevents 3rd user joining when game_mode is still 1vs1.

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

  -- Idempotent: if user is already host/member, do nothing.
  if g.host_id = new_user_id or (g.members @> array[new_user_id]) then
    return;
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


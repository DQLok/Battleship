-- Leave a room: drop the player from members. Delete the game if nobody remains.
-- If the host leaves and others stay, the first remaining member becomes host.

create or replace function public.leave_game_room(room_id uuid, leaving_user_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining text[];
  remaining_ready text[];
  current_host text;
begin
  select members, ready_members, host_id
    into remaining, remaining_ready, current_host
  from public.games
  where id = room_id
  for update;

  if not found then
    return;
  end if;

  remaining := array_remove(coalesce(remaining, '{}'::text[]), leaving_user_id);
  remaining_ready := array_remove(coalesce(remaining_ready, '{}'::text[]), leaving_user_id);

  if cardinality(remaining) = 0 then
    delete from public.games where id = room_id;
    return;
  end if;

  update public.games
  set
    members = remaining,
    ready_members = remaining_ready,
    host_id = case
      when current_host = leaving_user_id then remaining[1]
      else current_host
    end,
    updated_at = now()
  where id = room_id;
end;
$$;

grant execute on function public.leave_game_room(uuid, text) to anon, authenticated, service_role;

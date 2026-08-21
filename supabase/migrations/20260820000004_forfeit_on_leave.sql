-- Voluntary leave during playing: count participation (total_games) only, no wins.
-- Prevents farming wins by having an alt account leave.

create or replace function public.forfeit_game_on_leave(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  member_ids text[];
begin
  select members into member_ids
  from public.games
  where id = p_game_id;

  if member_ids is null or cardinality(member_ids) = 0 then
    return;
  end if;

  update public.profiles
  set total_games = total_games + 1,
      updated_at = now()
  where id = any(member_ids);

  delete from public.moves where game_id = p_game_id;
  delete from public.game_boards where game_id = p_game_id;
end;
$$;

grant execute on function public.forfeit_game_on_leave(uuid) to anon, authenticated, service_role;

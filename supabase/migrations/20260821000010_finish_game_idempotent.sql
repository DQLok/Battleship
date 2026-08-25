-- finish_game: idempotent if already finished (both clients may call).

create or replace function public.finish_game(p_game_id uuid, p_winner_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  player_ids text[];
  cur_status text;
begin
  select status into cur_status
  from public.games
  where id = p_game_id
  for update;

  if not found then
    return;
  end if;

  -- Already settled — do not double-count wins / total_games.
  if cur_status = 'finished' then
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

  delete from public.moves where game_id = p_game_id;
  delete from public.game_boards where game_id = p_game_id;
end;
$$;

-- Win: ghi match_results rồi đưa phòng về waiting (cùng room_code / members).
-- Nhiều trận / cùng game_id → bỏ unique match_results.game_id.

drop index if exists public.match_results_game_id_uidx;

create or replace function public.finish_game(p_game_id uuid, p_winner_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  player_ids text[];
  g public.games%rowtype;
begin
  select * into g
  from public.games
  where id = p_game_id
  for update;

  if not found then
    return;
  end if;

  -- Chỉ kết thúc khi đang chơi (idempotent nếu đã về waiting / setup).
  if g.status is distinct from 'playing' then
    return;
  end if;

  select array_agg(user_id) into player_ids
  from public.game_boards where game_id = p_game_id;

  if player_ids is null then
    player_ids := coalesce(g.members, '{}'::text[]);
  end if;

  update public.profiles
  set total_games = total_games + 1,
      updated_at = now()
  where id = any(player_ids);

  if p_winner_id is not null then
    update public.profiles
    set wins = wins + 1
    where id = p_winner_id;
  end if;

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
  );

  delete from public.moves where game_id = p_game_id;
  delete from public.game_boards where game_id = p_game_id;

  -- Đóng trận → waiting: giữ room_code / members / host; giữ winner_id để client hiện Modal.
  update public.games
  set status = 'waiting',
      winner_id = p_winner_id,
      current_turn = null,
      ready_members = '{}'::text[],
      disconnected_user_id = null,
      reconnect_until = null,
      updated_at = now()
  where id = p_game_id;
end;
$$;

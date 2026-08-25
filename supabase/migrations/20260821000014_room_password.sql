-- Room password (optional). Soft lock: join enforced in RPC.
-- List uses has_password; do not rely on hiding room_password from anon SELECT.

alter table public.games
  add column if not exists room_password text;

alter table public.games
  drop column if exists has_password;

alter table public.games
  add column has_password boolean
  generated always as (
    room_password is not null and btrim(room_password) <> ''
  ) stored;

-- Bỏ overload 2-arg cũ (không check mật khẩu).
drop function if exists public.join_game_room(uuid, text);

create or replace function public.join_game_room(
  room_id uuid,
  new_user_id text,
  p_password text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  g public.games%rowtype;
  members_count int;
  max_1vs1 bigint := public.game_lifecycle_get('max_members_1vs1', 2);
  expected text;
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

  expected := nullif(btrim(coalesce(g.room_password, '')), '');
  if expected is not null then
    if nullif(btrim(coalesce(p_password, '')), '') is distinct from expected then
      raise exception 'Sai mật khẩu phòng.';
    end if;
  end if;

  members_count := coalesce(array_length(g.members, 1), 0);

  if coalesce(g.game_mode, '1vs1') = '1vs1' and members_count >= max_1vs1 then
    raise exception 'Phòng (1vs1) đã đủ % người.', max_1vs1;
  end if;

  update public.games
  set members = array_append(members, new_user_id),
      updated_at = now()
  where id = room_id
    and not (members @> array[new_user_id]);
end;
$$;

grant execute on function public.join_game_room(uuid, text, text) to anon, authenticated, service_role;

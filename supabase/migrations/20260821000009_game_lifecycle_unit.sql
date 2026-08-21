-- Add unit column so each game_lifecycle value has an explicit unit.

alter table public.game_lifecycle
  add column if not exists unit text;

update public.game_lifecycle
set unit = case key
  when 'max_members_1vs1' then 'count'
  else 'seconds'
end
where unit is null;

alter table public.game_lifecycle
  alter column unit set not null;

alter table public.game_lifecycle
  drop constraint if exists game_lifecycle_unit_check;

alter table public.game_lifecycle
  add constraint game_lifecycle_unit_check
  check (unit in ('seconds', 'count'));

comment on column public.game_lifecycle.unit is
  'seconds = thời gian; count = số lượng (vd. max members)';

insert into public.game_lifecycle (key, value, unit, description) values
  ('reconnect_grace', 30, 'seconds', 'Chờ reconnect khi out giữa playing'),
  ('presence_away', 20, 'seconds', 'Mất tín hiệu đối thủ trước khi xử lý'),
  ('waiting_ttl', 86400, 'seconds', 'Xóa phòng waiting quá hạn'),
  ('setup_ttl', 21600, 'seconds', 'Xóa phòng setup treo'),
  ('finished_guest_ttl', 86400, 'seconds', 'Xóa finished có guest_*'),
  ('max_members_1vs1', 2, 'count', 'Tối đa người trong phòng 1vs1')
on conflict (key) do update
  set value = excluded.value,
      unit = excluded.unit,
      description = excluded.description,
      updated_at = now();

# Schedule `game_lifecycle`

Bảng `public.game_lifecycle` — cấu hình vòng đời phòng. Cột `unit` cho biết đơn vị của `value` (`seconds` hoặc `count`).

## Seed mặc định

| key | value | unit | Ghi chú |
| --- | ---: | --- | --- |
| `reconnect_grace` | `30` | `seconds` | Chờ reconnect khi out `playing` |
| `presence_away` | `20` | `seconds` | Mất tín hiệu đối thủ (client) |
| `waiting_ttl` | `86400` | `seconds` | Xóa `waiting` quá hạn (24h) |
| `setup_ttl` | `21600` | `seconds` | Xóa `setup` treo (6h) |
| `finished_guest_ttl` | `86400` | `seconds` | Xóa `finished` có `guest_*` (24h) |
| `max_members_1vs1` | `2` | `count` | Số người tối đa 1vs1 |

## API

- `game_lifecycle_get(key, default)` — đọc một value.
- `cleanup_stale_games()` — xóa phòng theo TTL; trả JSON số hàng đã xóa.
- `request_leave_with_reconnect` / `join_game_room` đọc `reconnect_grace` / `max_members_1vs1` từ bảng này.

## Cron (sau)

Gọi định kỳ (vd. mỗi giờ):

```sql
select public.cleanup_stale_games();
```

Hoặc Supabase Dashboard → Scheduled Functions / `pg_cron`.

## Client sync

- Fallback defaults: `src/constants/game-lifecycle.ts` (`GAME_LIFECYCLE_DEFAULTS`).
- Load on app start: `GameLifecycleProvider` → `fetchGameLifecycleSettings()`; lỗi DB → dùng defaults.
- UI/hooks đọc qua `useGameLifecycle().settings` (`reconnect_grace`, `presence_away`, `max_members_1vs1`, …).
- Server RPC vẫn đọc bảng trực tiếp (`game_lifecycle_get`).

## File

- Migration: `supabase/migrations/20260821000008_game_lifecycle.sql`, `…09_game_lifecycle_unit.sql`
- Constants: `src/constants/game-lifecycle.ts`
- API: `src/api/gameLifecycle.ts`
- Context: `src/context/GameLifecycleContext.tsx`

# Schedule `game_lifecycle` + bảng `match_results`

## `public.game_lifecycle`

Cấu hình vòng đời phòng. Cột `unit` = `seconds` | `count`.  
TTL tính theo **`games.updated_at`** không đổi. Xóa `games` → **cascade** xóa `match_results` cùng `game_id`.

| key | value | unit | Ghi chú |
| --- | ---: | --- | --- |
| `reconnect_grace` | `30` | `seconds` | Chờ reconnect khi out `playing` |
| `presence_away` | `20` | `seconds` | Mất tín hiệu đối thủ (client) |
| `waiting_ttl` | `172800` | `seconds` | Xóa `waiting` không update (2 ngày) |
| `setup_ttl` | `172800` | `seconds` | Xóa `setup` không update (2 ngày) |
| `playing_ttl` | `172800` | `seconds` | Xóa `playing` không update (2 ngày) |
| `finished_ttl` | `604800` | `seconds` | Xóa `finished` không update (7 ngày) |
| `games_ttl` | `2592000` | `seconds` | Catch-all mọi status (~1 tháng) |
| `max_members_1vs1` | `2` | `count` | Số người tối đa 1vs1 |

Mỗi status một key riêng để chỉnh độc lập sau này. Không còn `match_results_ttl` / `finished_guest_ttl`.

## `public.match_results`

Snapshot khi `finish_game`. FK `game_id` → `games(id)` **ON DELETE CASCADE**: xóa phòng = xóa lịch sử kèm theo.

| Cột | Ý nghĩa |
| --- | --- |
| `game_id` | UUID phòng (nhiều hàng nếu chơi lại cùng phòng) |
| `room_code`, `room_name`, `host_id`, `members` | Snapshot lúc kết thúc |
| `winner_id` | Người thắng |
| `game_mode` | `1vs1` / `team` |
| `finished_at` | Thời điểm kết thúc |

## API

- `game_lifecycle_get(key, default)`
- `finish_game` (chỉ khi `playing`) → insert `match_results` → xóa board/moves → **`games.status = waiting`**
- `cleanup_stale_games()` → xóa `games` theo TTL từng status + `games_ttl`; `match_results` cascade

## Cron

```sql
select public.cleanup_stale_games();
```

## Client

- Fallback: `src/constants/game-lifecycle.ts`
- Provider: `GameLifecycleProvider`
- Type: `src/types/supabase/MatchResult.ts`

## File

- `supabase/migrations/20260821000008_game_lifecycle.sql`
- `…09_game_lifecycle_unit.sql`
- `…11_match_results.sql`
- `…12_finish_return_waiting.sql`
- `…13_games_ttl_cascade_results.sql`

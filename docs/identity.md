# Identity — Telegram user vs Guest

## Hai vai trò

| Role | Điều kiện | Lưu trữ tài khoản |
| --- | --- | --- |
| **user** | Mini App Telegram + có `initData.user.id` | `public.profiles.telegram_id` |
| **guest** | Web, hoặc không đọc được `telegram_id` | **Không** insert `profiles`. Chỉ session tab. |

Gate DB: `canPersistTelegramUser()` = `hadRealTelegramAtLoad()` **và** `getTelegramId()`.

## Player id (định danh trong trận)

Mọi chỗ gameplay dùng **một chuỗi `player id`** = `useUser().user.id`:

| Nguồn | `user.id` |
| --- | --- |
| Telegram | `String(telegram user.id)` (= `profiles.id` = `telegram_id`) |
| Web | `guest_` + 8 ký tự, **mỗi tab một id** (`sessionStorage` key `battleship_guest_session`) |

Cùng id đó ghi vào:

- `games.host_id`, `games.members[]`
- `games.current_turn` — so sánh `current_turn === user.id` để biết lượt mình
- `games.winner_id` — người thắng (host hoặc guest đều là string id)
- `game_boards.user_id`, `moves.user_id`

Không cần `telegram_id` để tạo phòng / đánh / kết thúc trận. `telegram_id` chỉ để **nhận diện tài khoản** và cộng `wins`.

Hai tab cùng máy = hai guest (sessionStorage). Đóng tab là mất phiên.

## Luồng start

1. Init Telegram SDK ([telegram-init.md](./telegram-init.md)).
2. `ensureSession()` (`src/api/ensureProfile.ts`).
3. **User**: lookup/update/insert `profiles` theo `telegram_id`.
4. **Guest**: `loadGuestSession()` → không gọi insert `profiles`.

`useUser()` → `{ user, role, isGuest, loading }`.

## `public.profiles`

Chỉ user Telegram. Cột: `id`, `telegram_id` (unique), username, first/last, avatar, language, premium, `wins`, `total_games`. Không lưu SĐT / hash.

`finish_game` cộng stats **chỉ khi** `winner_id` / board `user_id` trùng một hàng `profiles`. Guest thắng hợp lệ: `games.winner_id` vẫn đúng, BXH không đổi. **Out/back giữa trận:** `forfeit_game_on_leave` — +`total_games` mỗi member, không +`wins`.

Dọn phòng guest và cấm lưu lịch sử kiểu tài khoản: [rules.md](./rules.md) §1–2.

## File

- `src/api/ensureProfile.ts`, `src/utils/user-info.ts`, `src/context/UserContext.tsx`
- `src/types/supabase/Profile.ts`, `Game.ts`

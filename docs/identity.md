# Identity — Telegram user vs Guest

## Hai vai trò

| Role | Điều kiện | Lưu trữ |
| --- | --- | --- |
| **user** | Mở **Telegram Mini App** và đọc được `initData.user.id` | `public.profiles` (`telegram_id` unique) |
| **guest** | Mở **web**, hoặc không có `telegram_id` | Chỉ `localStorage` — **không** insert `profiles` |

Gate đăng ký DB: `canPersistTelegramUser()` = `hadRealTelegramAtLoad()` **và** có `getTelegramId()`. Mock env trên browser không được coi là user Telegram.

## Luồng start app

1. `src/app.ts` init Telegram SDK (xem [telegram-init.md](./telegram-init.md)).
2. `UserProvider` gọi `ensureSession()` (`src/api/ensureProfile.ts`).
3. **User**: `SELECT profiles WHERE telegram_id = ?`
   - Có → `UPDATE` field public (không đụng `wins` / `total_games`).
   - Không → `INSERT` (`id` = `telegram_id` = Telegram user id dạng text).
4. **Guest**: `loadGuestSession()` → id `guest_xxxxxxxx`, username `Guest_XXXX`, ghi `localStorage` key `battleship_guest_session`.

Context: `useUser()` → `{ user, role, isGuest, loading }` (`src/context/UserContext.tsx`).

## `public.profiles`

| Cột | Ý nghĩa |
| --- | --- |
| `id` | PK dùng trong `games.members`, boards, moves |
| `telegram_id` | Unique, lookup khi mở Mini App |
| `username` | Display (`@username` hoặc first+last) |
| `telegram_username`, `first_name`, `last_name` | Public từ Telegram |
| `avatar_url` | `photo_url` nếu Telegram gửi |
| `language_code`, `is_premium`, `allows_write_to_pm` | Public optional |
| `wins`, `total_games` | Thành tích (guest = 0, không persist) |

Không lưu SĐT, hash `initData`, hay secret.

## Guest trong gameplay

- Không tạo phòng trên production (FAB ẩn). Local `npm run dev` vẫn cho tạo để test.
- Tham gia phòng của user: **nhập `room_code`** (Home + Lobby).
- Guest id được đưa vào `games.members` (text). Schema không FK `members` / boards / moves → `profiles`, nên guest chơi được mà không có hàng profile.
- `finish_game` tăng `wins`/`total_games` chỉ khi `user_id` trùng `profiles.id` — guest bỏ qua.

## File

- `src/api/ensureProfile.ts` — `ensureSession()`
- `src/utils/user-info.ts` — Telegram mapping, guest session, URL hash
- `src/types/supabase/Profile.ts`
- Migrations: `20260819000000_profiles_telegram_public.sql`, `20260819000001_profiles_telegram_id.sql`, `20260819000002_guest_sessions_and_room_code.sql`

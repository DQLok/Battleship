## Product
Battleship là game nhiều người chơi, chạy chủ yếu trong **Telegram Mini App**. User Telegram được lưu `public.profiles` theo `telegram_id`. Mở trên web (không có Telegram id) là **Guest**: chỉ `localStorage`, tham gia phòng bằng **mã phòng**.

Chi tiết: [docs/README.md](docs/README.md).

## Công nghệ
- Frontend: React + Vite (TypeScript), HashRouter
- Styling: SCSS `foundation/`, `overrides/`, `features/` (một file / page root class)
- Backend: Supabase (Postgres + RLS + RPC + realtime)
- Telegram: `@telegram-apps/sdk-react` — `initData.user` public fields

## Tổng quan xử lý (End-to-end)
1. **Khởi tạo phiên** — [docs/identity.md](docs/identity.md), [docs/telegram-init.md](docs/telegram-init.md)
   - Bootstrap: detect Telegram → mock nếu thiếu launch params (browser) → `init()` SDK → rồi mới `normalizeLaunchUrl()` (`#/` cho HashRouter).
   - Mini App + `telegram_id`: lookup/insert `profiles`.
   - Web / không id: Guest `guest_*` trong `localStorage`, không ghi DB.

2. **Tạo & tham gia phòng** — [docs/lobby.md](docs/lobby.md)
   - User Telegram tạo `games` (có `room_code` 6 ký tự).
   - Join: RPC `join_game_room` hoặc nhập mã (`joinRoomByCode`).
   - Guest không tạo phòng (prod); vào bằng mã.

3. **Đặt tàu** — [docs/combat.md](docs/combat.md)
   - Kéo từ dock thả lên lưới nhà; hoặc chọn tàu rồi chạm ô; xoay bằng nút / chạm ngắn tàu đã đặt.
   - Board: `public.game_boards` (`ships_data`, `is_ready`).

4. **Bắn theo lượt**
   - Insert `public.moves`; trigger `check_move_logic()` tính hit/sunk trên DB.

5. **Kết thúc trận**
   - RPC `finish_game`: cộng `wins`/`total_games` **nếu** id có trong `profiles`; set `games.status = finished`; xóa `moves` + `game_boards`.

6. **Realtime**
   - Subscribe `games`, `game_boards`, `moves`.

## Migrations
Không còn gói hết schema trong 1 file. Áp dụng theo thứ tự thời gian trên local **và** remote:

| File | Việc |
| --- | --- |
| `supabase/migrations/20250818000000_battleship_telegram_schema.sql` | Tables, RLS, RPC, trigger (schema hiện tại: profiles Telegram fields, `room_code`, không FK gameplay → profiles) |
| `20260819000000_profiles_telegram_public.sql` | Cột public Telegram trên `profiles` |
| `20260819000001_profiles_telegram_id.sql` | `telegram_id` unique + backfill |
| `20260819000002_guest_sessions_and_room_code.sql` | `room_code`, bỏ FK chặn guest id |

## Test local (web + DB local)
- Dev: `npm run dev` → http://localhost:5173/ (mở web = **Guest**)
- Studio: http://localhost:54333 — API: 54331 — Postgres: 54332
- Hai guest: mỗi tab một `localStorage`; một bên tạo phòng (dev FAB), bên kia nhập `room_code`.
- User thật: mở Mini App trong Telegram (hash `tgWebAppData`).
- Deploy Pages: `npm run deploy`. URL Mini App: `https://<user>.github.io/Battleship/` (có `/` cuối).

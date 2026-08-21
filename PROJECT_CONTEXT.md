## Product
Battleship là game nhiều người chơi, chạy chủ yếu trong **Telegram Mini App**. User Telegram được lưu `public.profiles` theo `telegram_id`. Mở trên web (không có Telegram id) là **Guest**: chỉ `localStorage`, tham gia phòng bằng **mã phòng**.

Chi tiết: [docs/README.md](docs/README.md). Ràng buộc: [docs/rules.md](docs/rules.md) (Guest không `profiles`, không BXH; dọn phòng guest; player id = `user.id`).

## Công nghệ
- Frontend: React + Vite (TypeScript), HashRouter
- Styling: SCSS `foundation/`, `overrides/`, `features/` (một file / page root class)
- Backend: Supabase (Postgres + RLS + RPC + realtime)
- Telegram: `@telegram-apps/sdk-react` — `initData.user` public fields

## Tổng quan xử lý (End-to-end)
1. **Khởi tạo phiên** — [docs/identity.md](docs/identity.md), [docs/telegram-init.md](docs/telegram-init.md)
   - Bootstrap: detect Telegram → mock nếu thiếu launch params (browser) → `init()` SDK → rồi mới `normalizeLaunchUrl()` (`#/` cho HashRouter).
   - Mini App + `telegram_id`: lookup/insert `profiles`.
- Web / không id: Guest `guest_*` **mỗi tab** (`sessionStorage`) — player id cho host/members/lượt/thắng, không ghi `profiles`.

2. **Tạo & tham gia phòng** — [docs/lobby.md](docs/lobby.md)
   - Telegram hoặc Guest tạo `games` (`room_code`). Join RPC hoặc mã phòng.
   - Status: `waiting` → `setup` (dàn tàu) → `playing` → `finished`.
   - Rời waiting: `leave_game_room`; hết member thì xóa phòng.
   - Rời `playing`: grace 30s reconnect; hết hạn → forfeit (+`total_games`, không win) → leave → `waiting`.

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
| `20260819000003_leave_game_room.sql` | RPC `leave_game_room`: hết member thì xóa `games` |
| `20260820000004_forfeit_on_leave.sql` | RPC `forfeit_game_on_leave`: out trận chỉ +`total_games`, không win |
| `20260820000005_reconnect_grace.sql` | Grace 30s reconnect: `request_leave_with_reconnect`, `reconnect_to_game`, `finalize_disconnected_leave` |
| `20260820000006_limit_1vs1_members.sql` | `join_game_room`: 1vs1 max 2 members |
| `20260821000007_games_status_setup.sql` | Thêm `status = setup` (dàn tàu); join mới chỉ lúc `waiting` |
| `20260821000008_game_lifecycle.sql` | Schedule `game_lifecycle` + `cleanup_stale_games` |
| `20260821000009_game_lifecycle_unit.sql` | Cột `unit` (`seconds` / `count`) trên `game_lifecycle` |

## Test local (web + DB local)
- Dev: `npm run dev` → http://localhost:5173/ (mở web = **Guest**)
- Studio: http://localhost:54333 — API: 54331 — Postgres: 54332
- Migration chưa áp: `supabase migration up` (REST `PGRST204` thiếu `room_code` = DB còn schema cũ).
- Hai guest: **hai tab** (mỗi tab một `guest_*`); một bên +, bên kia nhập `room_code`. Lượt = `games.current_turn === user.id`. Thắng = `games.winner_id`.
- User thật: mở Mini App trong Telegram (hash `tgWebAppData`).
- Deploy Pages: `npm run deploy`. URL Mini App: `https://<user>.github.io/Battleship/` (có `/` cuối).

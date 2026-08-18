## Product
Battleship là game nhiều người chơi chạy trong Telegram Mini App. Người chơi dùng Telegram ID làm định danh trong DB để tạo/phòng đấu, đặt tàu và bắn theo lượt.

## Công nghệ
- Frontend: React + Vite (TypeScript)
- Styling: SCSS, tách theo lớp `foundation/`, `overrides/`, và `features/` theo từng page root class.
- Backend/BaaS: Supabase (Postgres + RLS + RPC functions + realtime)
- Telegram integration: client đọc `initData`/user info để xác thực, gửi yêu cầu tới Supabase với role phù hợp.

## Tổng quan xử lý (End-to-end)
1. Khởi tạo người chơi
   - Client lấy thông tin người dùng từ Telegram và map sang `public.profiles.id` (text).
   - Nếu chưa có profile, app tạo/ensure profile (hoặc thao tác upsert theo logic của project).

2. Tạo & tham gia phòng đấu
   - Người chơi tạo room (`public.games`) và các state chung như `status`, `members`, `game_mode`.
   - Tham gia phòng được thực hiện qua RPC `public.join_game_room(room_id, new_user_id)` để thêm user vào `members` (idempotent).

3. Đặt tàu
   - Mỗi người có một bản đặt tàu trong `public.game_boards` với `ships_data` (jsonb) và `is_ready`.
   - App cập nhật board của người chơi; RLS giúp giới hạn dữ liệu theo chế độ xác thực (hiện tại đang để policy mở cho dev).

4. Bắn theo lượt & tính hit/sunk
   - Khi client ghi một nước bắn vào `public.moves`, trigger `public.check_move_logic()` (BEFORE INSERT) sẽ:
     - Đọc `ships_data` của đối thủ trong `public.game_boards`
     - Tính `NEW.is_hit`
     - Nếu hit làm chìm toàn bộ tàu, set `NEW.sunk_ship_name`
   - Nhờ đó logic hit/sunk nằm ở DB (đồng bộ, ít lệch giữa client và server).

5. Kết thúc trận
   - Khi trận kết thúc, client gọi RPC `public.finish_game(p_game_id, p_winner_id)` để:
     - Tăng `wins`/`total_games` cho người chơi trong `public.profiles`
     - Cập nhật `public.games.status = 'finished'` và `winner_id`
     - Xóa dữ liệu tạm `public.moves` và `public.game_boards` của trận để giảm dung lượng.

6. Realtime
   - App subscribe realtime cho các bảng `public.games`, `public.game_boards`, `public.moves` để cập nhật UI ngay khi state thay đổi.

## Ghi chú về Migration
Project đang dùng đúng 1 migration SQL cho cả schema và RPC/trigger để dễ tối ưu/đồng bộ giữa local và remote:
- file: `supabase/migrations/20250818000000_battleship_telegram_schema.sql`
- chứa: tables + indexes + RLS + realtime + RPC functions + trigger logic.

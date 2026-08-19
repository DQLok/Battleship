# Lobby & phòng đấu

## Tạo phòng

- Chỉ **user Telegram** (production). Guest: nhập mã, không bấm tạo (FAB ẩn). Dev vẫn hiện FAB để test.
- `createRoom(userId)` insert `games` kèm `room_code` 6 ký tự (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`), retry nếu trùng.
- RPC không bắt buộc lúc tạo. `host_id` + `members = [userId]`, `status = waiting`.

## Tham gia

- Từ danh sách: `join_game_room(room_id, new_user_id)` (idempotent).
- Từ **mã phòng**: `joinRoomByCode(code, userId)` — `SELECT games WHERE room_code` (`waiting` hoặc `playing`) rồi join.
- UI nhập mã: `src/features/lobby/components/JoinRoomCode.tsx` (Home + Lobby).

## `room_code`

- Cột `public.games.room_code` (unique khi not null).
- Hiện trên RoomCard, Waiting Room (chủ phòng đưa guest).
- Phòng cũ không có code: migration backfill từ `md5(id)`.

## Waiting room

- `src/features/lobby/WaitingRoom.tsx`
- Member không có hàng `profiles` (guest) được ghép UI từ id `guest_*` hoặc session hiện tại.
- Host start khi mọi member (trừ host) nằm trong `ready_members`.

## Schema ghi chú

`games.host_id` / `current_turn` / `winner_id` và `game_boards.user_id` / `moves.user_id` **không** FK sang `profiles`, để guest id tồn tại trong trận. `finish_game` chỉ cộng stats nếu id có trong `profiles`.

## File

- `src/features/lobby/LobbyPage.tsx`, `WaitingRoom.tsx`, `components/RoomCard.tsx`, `JoinRoomCode.tsx`
- `src/hooks/useSupabase.ts` — `createRoom`, `joinRoom`, `joinRoomByCode`
- `src/types/supabase/Game.ts`
- Migration: `20260819000002_guest_sessions_and_room_code.sql`

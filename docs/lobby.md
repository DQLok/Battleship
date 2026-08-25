# Lobby & phòng đấu

## Tạo phòng

- Home + Lobby: **popup** tạo phòng — **Tạo nhanh** hoặc **Có mật khẩu**.
- `createRoom(user.id, { password? })` → `host_id`, `members = [user.id]`, `room_code` 6 ký tự, optional `room_password`.
- `has_password` (generated): true khi có mật khẩu. List **không** select `room_password`.

## Danh sách Lobby

- `fetchRooms`: cột công khai + `has_password` (không plaintext mật khẩu). Status `waiting` | `setup` | `playing` | `finished`.
- RoomCard: **code**, **tên host**, **trạng thái**, **tổng members**. Status `waiting` → nút **Tham gia** (host/member: Vào phòng).
- Phòng có MK: icon khóa; join mở sheet nhập mật khẩu.

## Tham gia

- `join_game_room(room_id, new_user_id, p_password?)` — chỉ `waiting`; sai MK → exception. Member/host sẵn có: bỏ qua MK.
- Từ danh sách / mã phòng: nếu `has_password` và chưa là member → nhập đúng mật khẩu.
- `setup`/`playing`: chỉ member vào lại → Combat.

## Status `games`

| Status | Ý nghĩa |
| --- | --- |
| `waiting` | Phòng chờ lobby |
| `setup` | Đã start — mọi người đang dàn tàu trên Combat |
| `playing` | Đang bắn |
| `finished` | Trận xong |

Host BẮT ĐẦU → `setup`. Cả hai xác nhận triển khai → `playing`. Win → `match_results` rồi về `waiting` (cùng phòng). Rút quân rematch → `setup`.

## `room_code`

- Cột `public.games.room_code` (unique khi not null).
- Hiện trên RoomCard, Waiting Room (chủ phòng đưa guest).
- Phòng cũ không có code: migration backfill từ `md5(id)`.

## Waiting room

- `src/features/lobby/WaitingRoom.tsx`
- `1vs1` chỉ cho tối đa 2 người trong `games.members` (server enforce). Nếu phòng full, join sẽ bị từ chối.
- Member không có hàng `profiles` (guest) được ghép UI từ id `guest_*` hoặc session hiện tại.
- Host start khi mọi member (trừ host) nằm trong `ready_members` → `status: setup` (không nhảy thẳng `playing`).
- **Rời phòng** (Back / unmount khi còn `waiting` / đóng tab): RPC `leave_game_room`. Xóa player khỏi `members`. **Không còn member → xóa `games`**. Host rời mà còn người: `host_id` = member còn lại đầu tiên. Vào **setup/combat** thì không gọi leave từ WaitingRoom.

## Rời phòng giữa trận (`playing`)

A host, B member — cả hai đã start:

| Ai out | DB sau xử lý | Người out | Người còn |
| --- | --- | --- | --- |
| **B** | `waiting`, `members = [A]`, A host | `/lobby` | **WaitingRoom** (không bị đá) |
| **A** | `waiting`, `members = [B]`, **B thành host** | `/lobby` | **WaitingRoom** |

Luồng server (`requestLeaveWithReconnect` → hết hạn mới `finalize`):

1. **Rời tạm (`playing`):** RPC `request_leave_with_reconnect` — giữ `members`, set `disconnected_user_id` + `reconnect_until` (+30s mặc định). **Chưa** forfeit, **chưa** xóa khỏi phòng.
2. **Người còn:** ở Combat, overlay đếm ngược; không bắn. Người lạ không join được (grace active).
3. **Người rời kết nối lại:** nút Home/Lobby, nhập mã, hoặc vào `/combat` → RPC `reconnect_to_game` (trong hạn) → tiếp tục trận.
4. **Hết hạn:** RPC `finalize_disconnected_leave` → `forfeit_game_on_leave` (+`total_games`, không win) → `leave_game_room` → `waiting`.

Người rời **luôn** về Lobby ngay. Người còn ở Combat đến hết grace hoặc đối thủ reconnect.

**Win** chỉ qua `finish_game` có `winner_id` (bắn hết tàu, rematch surrender) — không qua out/back.

## Schema ghi chú

`games.host_id` / `current_turn` / `winner_id` và `game_boards.user_id` / `moves.user_id` **không** FK sang `profiles`, để guest id tồn tại trong trận. `finish_game` / `forfeit_game_on_leave` chỉ cộng stats nếu id có trong `profiles`. Dọn `waiting`/`finished` guest: [rules.md](./rules.md) §2.

## File

- `src/features/lobby/LobbyPage.tsx`, `WaitingRoom.tsx`, `components/RoomCard.tsx`, `JoinRoomCode.tsx`, `CreateRoomSheet.tsx`, `JoinPasswordSheet.tsx`
- `src/hooks/useSupabase.ts` — `createRoom`, `joinRoom`, `joinRoomByCode`, `leaveRoom`, `leaveBattle`
- `src/types/supabase/Game.ts`
- Migration mật khẩu: `20260821000014_room_password.sql`

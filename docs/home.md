# Home — Battleship Mini App

Trang đầu: vào lobby / nhập mã phòng, xem BXH và thành tích. Identity: [identity.md](./identity.md).

## Mục tiêu

- Cửa vào Lobby hoặc join bằng `room_code`.
- **BXH**: top 10 `profiles.wins`.
- **Thành tích**: `total_games` / `wins` của user Telegram; Guest không fetch DB (hiện 0 + ghi chú).
- Phụ: cài đặt / thưởng ngày — snackbar “đang triển khai”.

## File

- `src/features/home/HomePage.tsx`
- `src/features/lobby/components/JoinRoomCode.tsx`
- `src/context/UserContext.tsx`, `src/types/supabase/Profile.ts`
- Style: `src/css/features/home.scss` (`.join-room-code`, `.guest-hint`)

## Điều hướng / UI

- **Nhập mã phòng**: mọi role; Guest dùng đây để vào phòng user.
- Guest banner: mở Mini App Telegram để lưu tài khoản.
- **Bắt đầu Chiến đấu** / **Danh sách phòng** (Guest) → `/lobby`.
- BXH / Thành tích / Cài đặt / Hàng ngày: như cũ (Sheet / snackbar).

## BXH

`profiles`: `select` id, username, avatar_url, wins, total_games, timestamps; `order wins desc`; `limit 10`.

## Thành tích

- User: `eq("id", user.id).maybeSingle()`.
- Guest: không query; copy trong Sheet giải thích không lưu thành tích server.
- Lỗi fetch: fallback `user` từ context.

## Checklist

- Web: role Guest, không có hàng `profiles` mới khi chỉ mở Home.
- Telegram: có `telegram_id` trên `profiles`.
- Nhập mã phòng hợp lệ → waiting hoặc combat.
- BXH / thành tích / snackbar phụ.

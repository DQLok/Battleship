# Home — Battleship Mini App

Tài liệu này mô tả trang **Home** (màn hình đầu tiên) và các tính năng liên quan: điều hướng, BXH, thành tích, và các mục đang triển khai.

## Mục tiêu

- Là “cửa vào” nhanh để người chơi bắt đầu vào Lobby và tham gia trận.
- Hiển thị thông tin nổi bật:
  - **BXH**: Top 10 người chơi có `wins` cao nhất.
  - **Thành tích**: `total_games` và `wins` của người chơi hiện tại.
- Các mục phụ:
  - **Cài đặt**: hiện thông báo “đang triển khai”.
  - **Phần thưởng hằng ngày**: hiện thông báo “đang triển khai”.

## File liên quan

- UI + logic fetch data: `src/features/home/HomePage.tsx`
- User context (đảm bảo profile tồn tại trong DB): `src/context/UserContext.tsx`
- Type: `src/types/supabase/Profile.ts`

## Điều hướng

- Nút **“Bắt đầu Chiến đấu”**: điều hướng sang `/lobby`.
- Các nút nhanh:
  - **BXH**: mở Sheet hiển thị top 10.
  - **Thành tích**: mở Sheet hiển thị stats của user.
  - **Cài đặt**: snackbar “đang triển khai”.
- Khối **Hàng ngày** (Daily Reward): snackbar “đang triển khai”.

## BXH (Top 10 wins)

Nguồn dữ liệu: bảng `profiles`.

- Query (client-side):
  - `select(id, username, avatar_url, wins, total_games, created_at, updated_at)`
  - `order("wins", { ascending: false })`
  - `limit(10)`

UI:

- Hiển thị xếp hạng 1–10, avatar, username/id, số `wins`.

## Thành tích (của người chơi hiện tại)

Nguồn dữ liệu: bảng `profiles` theo `id` của user hiện tại.

- Query (client-side):
  - `eq("id", user.id).maybeSingle()`

UI:

- **Trận tham gia**: `total_games`
- **Trận thắng**: `wins`

Lưu ý:

- Nếu fetch profile lỗi, UI fallback sang dữ liệu `user` từ `UserContext` (best-effort).

## Các mục đang triển khai

- **Cài đặt**: hiển thị snackbar “Tính năng cài đặt đang triển khai.”
- **Phần thưởng hằng ngày**: hiển thị snackbar “Tính năng phần thưởng hằng ngày đang triển khai.”

## Checklist test nhanh

- Mở Home:
  - BXH load được (hoặc hiện “Chưa có dữ liệu”).
  - Thành tích hiển thị đúng `wins` và `total_games`.
- Bấm:
  - “Bắt đầu Chiến đấu” → vào `/lobby`.
  - “BXH” → mở/đóng Sheet ok.
  - “Thành tích” → mở/đóng Sheet ok.
  - “Cài đặt” + “Hàng ngày” → hiện snackbar “đang triển khai”.

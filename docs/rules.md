# Rules — Battleship Mini App

Nguồn ràng buộc sản phẩm + kỹ thuật. Chi tiết feature: file trong `docs/` (xem [README](./README.md)). Cursor rules song song: `.cursor/rules/*.mdc`.

Khi đổi hành vi: sửa **docs này + file feature** cùng lúc với code.

---

## 1. Sản phẩm và định danh

- Kênh chính: **Telegram Mini App**. Web (không `telegram_id`) là **Guest** — chơi được, không phải tài khoản.
- **Không** insert Guest vào `public.profiles`. `profiles` chỉ user Telegram (`telegram_id` unique).
- Guest chỉ được ghi `profiles` khi có **định danh bền** (mở Mini App Telegram, hoặc login/link có chủ đích). Không auto-promote từ tab web.
- Gate persist: `canPersistTelegramUser()` = `hadRealTelegramAtLoad()` **và** `getTelegramId()`. Mock env trên browser **không** phải user Telegram.

Chi tiết: [identity.md](./identity.md).

### Player id (gameplay)

Một chuỗi `user.id` dùng cho toàn bộ trận:

| Nguồn | `user.id` | Lưu phiên |
| --- | --- | --- |
| Telegram | `String(telegram user.id)` (= `profiles.id`) | `profiles` |
| Web | `guest_` + 8 ký tự | `sessionStorage` `battleship_guest_session` — **mỗi tab một id** |

Ghi cùng id vào: `games.host_id`, `members[]`, `current_turn`, `winner_id`, `game_boards.user_id`, `moves.user_id`.

- Lượt mình: `games.current_turn === user.id`.
- Thắng: `games.winner_id` = id người thắng (Telegram hoặc `guest_*`).
- `finish_game` cộng `wins` / `total_games` **chỉ khi** id có hàng `profiles`. Guest thắng: trận `finished` đúng, BXH không đổi.
- Không FK gameplay → `profiles` (để `guest_*` tồn tại trong trận).
- Không persist SĐT / `initData` hash. Chỉ field public Telegram trên `profiles`.

### BXH và thống kê

- BXH Home = top `profiles.wins`. Guest **không** hiện trên BXH, không farm win bằng tab mới.
- User Telegram: thống kê trên `profiles`, không bắt buộc nhật ký từng trận.

---

## 2. Phòng, lịch sử, dọn dữ liệu

- Telegram **và** Guest đều **tạo phòng** (`createRoom(user.id)`) và **join bằng `room_code`**.
- Rời phòng waiting: `leave_game_room`. Không còn member → xóa phòng (giải unique `unique_waiting_room_per_user`).
- **Status phòng:** `waiting` → `setup` (dàn tàu) → `playing` (bắn) → `finished`. Người mới chỉ join lúc `waiting`; `setup`/`playing` chỉ member vào lại.
- Trong trận: giữ `games` + `game_boards` + `moves` (realtime / lượt).
- `finish_game`: `games.status = finished`; xóa `moves` + `game_boards` (như RPC hiện tại).
- Guest **không** lưu lịch sử kiểu tài khoản (không profile, không `wins`).
- Schedule **`game_lifecycle`** (`public.game_lifecycle`): TTL / reconnect / cap 1vs1. Cột `unit` = `seconds` | `count`. Client đồng bộ qua `GameLifecycleProvider`; fallback `src/constants/game-lifecycle.ts`. Chi tiết [game-lifecycle.md](./game-lifecycle.md).
- **Dọn định kỳ**: RPC `cleanup_stale_games()` đọc TTL từ schedule (chưa bắt buộc đã gắn cron).
  - Xóa `waiting` / `setup` / `finished` có guest theo TTL.

Chi tiết phòng: [lobby.md](./lobby.md). Combat: [combat.md](./combat.md).

---

## 3. Telegram bootstrap

Thứ tự `src/app.ts`: polyfill → `markRealTelegramAtLoad()` → mock **chỉ khi** thiếu launch params → `initTelegram()` → **rồi** `normalizeLaunchUrl()`.

- Không biến `#tgWebAppData=...` thành route HashRouter trước khi SDK đọc.
- BotFather URL: `https://<user>.github.io/Battleship/` (**có `/` cuối**).
- Lỗi SDK/bridge production: không blank cả app.

Chi tiết: [telegram-init.md](./telegram-init.md).

---

## 4. Workflow repo

- Đổi tối thiểu, theo flow đã document — không invent luồng song song (user, phòng, init, dàn trận).
- Trước khi code: `PROJECT_CONTEXT.md` + file `docs/` tương ứng + `docs/rules.md`.
- Sau đổi schema / API / hành vi: cập nhật docs cùng task.
- Không revert thay đổi của user trừ khi được yêu cầu.
- Verify: `npm run build` hoặc check hẹp.
- Không `reset --hard` / force push trừ khi user yêu cầu. Không commit secrets (`.env`, token).
- Grapuco: sau đổi `src/` có ý nghĩa → `grapuco push`. Không commit `.grapuco/ast-cache/**`. Được track: `.grapuco/config.json`.

Cursor: `.cursor/rules/core-workflow.mdc`, `docs-workflow.mdc`, `grapuco-workflow.mdc`.

Map cập nhật docs:

| Đổi gì | Sửa |
| --- | --- |
| Identity / guest / profiles / dọn guest | `identity.md`, **`rules.md`**, `PROJECT_CONTEXT.md` |
| Home / BXH | `home.md` |
| Lobby / room_code | `lobby.md`, **`rules.md`** nếu đổi tạo phòng / dọn |
| Combat | `combat.md` |
| Telegram SDK / Pages URL | `telegram-init.md` |
| Migration mới | bảng trong `PROJECT_CONTEXT.md` |

---

## 5. CSS / SCSS (`src/css`)

- `foundation/`: token + base. `overrides/`: ZaUI. `features/`: một file / page, nested dưới root class.
- `app.scss` chỉ gom `foundation/*` + `overrides/*`.
- Page import đúng một `src/css/features/<feature>.scss`.
- Tên file khớp class: `home.scss` → `.home-page`, `waiting-room.scss` → `.waiting-page`.
- Màu/glow: biến `_tokens.scss`. Pattern dùng ≥2 feature → `src/css/components/`.

Cursor: `.cursor/rules/css-architecture.mdc`.

---

## 6. TypeScript và React

- Type rõ cho export (hàm, hook, store). Domain types trong `src/types/`. Tránh `any`; dùng `unknown` rồi narrow.
- Logic lặp → helper thuần. `try/catch` hẹp quanh thao tác có thể fail; lỗi async có fallback / message UI.
- Component mỏng; logic nặng ở `src/hooks` hoặc hook feature. UI derive từ props/store. Early return loading/empty/error.
- Shared UI: `src/components`. Feature UI: `src/features/<feature>/components`.
- Không đổi UX hiện có trừ khi task yêu cầu.

Cursor: `typescript-standards.mdc`, `react-component-patterns.mdc`.

---

## 7. Combat (ràng buộc UX)

- Dàn trận: kéo từ dock hoặc chọn rồi chạm ô; cyan hợp lệ / đỏ invalid.
- Đủ 4 tàu mới xác nhận triển khai.
- Online: bắn theo `current_turn` + insert `moves`; bot mode offline cùng store/UI.
- Rời giữa trận (out/back): grace **30s** reconnect; hết hạn → forfeit (+`total_games`, không win).
- **Rút quân** (nút + confirm): người bấm thua, đối thủ +win (nếu có `profiles`); cả hai ở Combat, về dàn trận.
- `winner_id` online: id mình nếu thắng, **id đối thủ** nếu thua — không để chuỗi rỗng.

Chi tiết: [combat.md](./combat.md).

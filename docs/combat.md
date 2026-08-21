# Combat (Chiến dịch) — Battleship Mini App

Tài liệu này mô tả **tính năng Combat** (dàn trận + chiến đấu) trong mini app Battleship, kèm **quy tắc phát triển** (rules + hooks) áp dụng khi chỉnh sửa feature này.

## Mục tiêu tính năng

- **Dàn trận**: đặt 4 tàu lên lưới 10×10 (kéo thả từ dock hoặc chọn rồi chạm ô).
- **Chiến đấu**:
  - **Online**: bắn theo lượt qua realtime events của Supabase.
  - **Bot mode**: chơi offline giả lập (địch là bot), vẫn dùng chung store + UI.
- **Kết thúc trận**: xác định thắng/thua, hiển thị modal, và (online) gọi RPC để lưu kết quả.

**Player id (online):** lượt mình khi `games.current_turn === user.id`; thắng ghi `games.winner_id` = id người thắng (Telegram hoặc `guest_*`). Chi tiết [identity.md](./identity.md).

## Cấu trúc thư mục liên quan

- `src/features/combat/CombatPage.tsx`: trang chính Combat, điều phối toàn bộ flow.
- `src/features/combat/components/`
  - `GameGrid.tsx`: lưới nhà/địch; pointer drag, ghost hợp lệ/invalid.
  - `ShipDock.tsx`: kéo tàu ra bản đồ.
  - `ShipDragGhost.tsx`: preview theo con trỏ khi đang kéo.
  - `ShipStatusHeader.tsx`, `CombatControls.tsx`
- `src/hooks/useCombatStore.ts`: Zustand store cho toàn bộ state/actions của combat.
- `src/hooks/useSupabase.ts`: API layer + subscribe presence phục vụ online.
- `src/features/combat/constants.ts`: cấu hình hạm đội và kích thước lưới.

## Luồng màn hình (CombatPage)

### 1) Dàn trận (pre-battle) — `games.status = setup`

Host bấm BẮT ĐẦU ở WaitingRoom → `status: setup` → mọi member vào Combat (màn DÀN TRẬN).

- **Kéo** tàu từ `ShipDock` thả lên lưới nhà (`GameGrid type="home"`). Ô cyan = hợp lệ, đỏ = lệch/đè.
- Hoặc **chạm chọn** tàu (giữ “armed”) rồi chạm một ô trên lưới.
- **XOAY TÀU** khi đang giữ tàu (`toggleDraggingRotation`).
- Tàu đã đặt: **chạm ngắn** = xoay (`rotateShipAt`); **kéo** (ngưỡng ~10px) = nhấc (`pickUpShip`) rồi thả lại.
- Đủ 4 tàu (`placedShips.length === 4`) mới “XÁC NHẬN TRIỂN KHAI”.
- `DÀN TRẬN NGẪU NHIÊN` → `autoPlaceShips()`.
- Khi **cả hai** đã `game_boards.is_ready` → `status: playing` + set `current_turn`.

Store: `setDraggingShip` / `updateDraggingPos` / `placeShip` / `pickUpShip` / `rotateShipAt` (`useCombatStore`). Pointer trên window (không chỉ `touchmove`) để Telegram + desktop cùng kéo được.

### 2) Vào trận (battle) — `games.status = playing`

Khi vào trận, UI chia làm 2 phần:

- **Lưới địch**: `GameGrid type="enemy"`
  - Chỉ cho bắn khi `turn === true`
  - Không cho bắn lại ô đã có kết quả (`enemyGrid[y][x] !== "empty"`)
- **Lưới nhà**: `GameGrid type="home"` (hiển thị tàu + trạng thái bị bắn)

### 3) Kết thúc / thoát trận

- Khi có `winner` (`"player"` hoặc `"enemy"`):
  - Hiện `Modal` kết quả và gọi `handleEndSession()` để dọn state local.
  - Với online: `finishGame(gameId, winnerId)` được gọi trong effect cleanup.
- Khi người chơi **Back** lúc đang chiến đấu:
  - Sheet **rời trận** (`requestLeaveWithReconnect`, grace 30s). Không phải rút quân.
  - Chi tiết: [lobby.md](./lobby.md) § “Rời phòng giữa trận”.

### 4) Rút quân (Surrender) — thua và dàn trận lại

Khi `inBattle`, nút **`RÚT QUÂN (SURRENDER)`** mở popup xác nhận. Xác nhận:

- Người bấm **xử thua**: +1 `total_games`; đối thủ +1 `wins` và +1 `total_games` (chỉ nếu có hàng `profiles`).
- **Không ai rời phòng** (`members` giữ nguyên).
- Reset trận: xóa `moves` + `game_boards`; `games` → `setup`, clear lượt; cả hai **ở CombatPage** dàn trận lại.
- Đủ 2 bên xác nhận triển khai → `status: playing`.
- Khác **Rời trận** (Back khi đang bắn): grace 30s reconnect, không cộng win.

## Chế độ Online (Supabase Realtime)

### Dữ liệu chính (Supabase types)

- **Game**: `src/types/supabase/Game.ts`
  - `status` (`waiting` | `setup` | `playing` | `finished`), `room_code`, `current_turn`, `winner_id`, `members`, `ready_members`
- **GameBoard**: `src/types/supabase/GameBoard.ts`
  - `ships_data`: layout tàu của từng người chơi
  - `is_ready`: đã dàn trận xong chưa
- **Move**: `src/types/supabase/Move.ts`
  - `(x, y)`, `user_id`, `is_hit` (được server/trigger tính tuỳ schema)

### Realtime channels trong CombatPage

CombatPage tạo 2 kênh realtime tách biệt theo `gameId`:

- `moves_<gameId>`: lắng nghe `INSERT` vào bảng `moves`
  - callback gọi `recordMove(user_id, x, y, is_hit, currentUserId, sunk_ship_name)`
- `boards_<gameId>`: lắng nghe thay đổi bảng `game_boards`
  - khi đối thủ `is_ready === true` → lấy `ships_data` và `setEnemyShips(...)`

### Presence và auto-win khi đối thủ rớt mạng

Presence được subscribe khi **online + inBattle**:

- `subscribePresence(gameId, userId, onOpponentLeft, onOpponentJoined)`
  - nếu chỉ còn mình online → `isOpponentAway = true`
  - khi đối thủ quay lại → reset `countdown = 20`

Cơ chế auto-win:

- Có **grace period 5s** sau khi vào trận (`isGracePeriod`) để realtime ổn định.
- Khi `isOpponentAway` và hết grace period:
  - bắt đầu đếm `countdown` từ 20 về 0
  - nếu chạm 0 → `handleAutoWin()` set `winner: "player"` và gọi `finishGame(gameId, null)`

## Chế độ Bot (offline)

Trong bot mode, CombatPage không dùng realtime moves:

- Khi start:
  - tạo đội hình bot: `generateRandomFleet()`
  - `setEnemyShips(botFleet)`, set `turn = true`
- Khi bắn:
  - `handleAttackEnemy()` tự tính `hitShip` dựa trên `enemyShips`
  - cập nhật store bằng `recordMove(...)`
- Bot bắn trả:
  - `recordMove()` sẽ gọi `botTurnAction()` khi tới lượt bot và chưa có winner.

## State & quy tắc gameplay trong `useCombatStore`

### Lưới và trạng thái ô

- `playerGrid` / `enemyGrid`: ma trận \(10x10\) của `CellStatus`:
  - `empty | ship | hit | miss | invalid`
- `refreshGrid(ships, ghost?)`:
  - vẽ tàu lên grid
  - nếu đang kéo (`ghost`): đánh dấu `invalid` nếu chồng lấn/ngoài biên

### Đặt tàu

- `checkValidPlacement(...)`: không chồng tàu, không ra khỏi lưới.
- `setDraggingShip` / `updateDraggingPos` / `placeShip` / `pickUpShip` / `rotateShipAt`:
  - tối ưu cho thao tác mobile (pointer/touch) trên `GameGrid`.

### Bắn và đổi lượt

- `recordMove(userId, x, y, isHit, currentUserId, sunkShipName?)`
  - cập nhật grid bị tác động (bên mình hoặc bên địch)
  - cập nhật `lastPlayerAttack` / `lastBotAttack` để vẽ crosshair
  - cập nhật `sunkShips` + `sunkShipsData` (toạ độ các hit nối liền cho tàu đã chìm)
  - tính `turn` tiếp theo theo hit/miss và ai là người bắn
  - gọi `checkGameOver()`

### Điều kiện thắng

- Người chơi thắng khi `sunkShips.length === 4` (bắn chìm đủ 4 tàu địch).
- Địch thắng khi **tất cả tàu của mình** đều “sunk” (`isShipSunk(playerGrid, ship)` cho mọi `placedShips`).

## Quy tắc phát triển (rules + hooks) áp dụng cho Combat

### Cursor Rules (định hướng AI khi sửa code)

Các rule nằm ở `.cursor/rules/`:

- `core-workflow.mdc` (always apply)
  - ưu tiên sửa nhỏ, giữ convention sẵn có
  - tránh thao tác phá huỷ git, không đưa secrets vào code/commit
  - sau edit đáng kể nên có bước verify (ví dụ `npm run build`)
- `typescript-standards.mdc` (áp dụng cho `**/*.{ts,tsx,mts}`)
  - hạn chế `any`, ưu tiên type rõ ràng cho export/hook/store
  - tách helper nhỏ, xử lý async/error gọn
- `react-component-patterns.mdc` (áp dụng cho `src/**/*.tsx`)
  - tách logic nặng ra hook, tránh duplicated state
  - `useEffect` dependency rõ ràng, giữ hành vi UI hiện có
  - tuân thủ tổ chức thư mục `src/components` vs `src/features/...`

### Cursor Hook (chặn lệnh shell rủi ro)

Hook cấu hình tại `.cursor/hooks.json`, chạy event `beforeShellExecution`:

- Script: `.cursor/hooks/safe-shell-check.sh`
  - `deny`: `rm -rf /`
  - `ask`: `git reset --hard`
  - `ask`: `git push --force`

Mục tiêu: giảm rủi ro mất dữ liệu khi thao tác trong repo lúc phát triển/tối ưu combat.

## Test plan (gợi ý nhanh)

- Dàn trận: kéo từ dock; xoay; kéo tàu đã đặt; auto place; sau xác nhận không chỉnh layout.
- Guest vs Telegram: xem [identity.md](./identity.md) / [lobby.md](./lobby.md) nếu test join bằng mã phòng rồi vào combat.
- Bot mode:
  - bắn trúng/hụt; bot bắn trả; kết thúc trận hiển thị đúng winner.
- Online:
  - 2 client vào cùng `gameId`; cả hai ready; bắn luân phiên qua realtime.
  - tắt mạng 1 bên để kiểm tra countdown + auto-win sau grace period.
  - đang giao tranh, 1 bên bấm “RÚT QUÂN”: cả hai reset dàn trận, stats cập nhật đúng.
# Combat (Chiến dịch) — Battleship Mini App

Tài liệu này mô tả **tính năng Combat** (dàn trận + chiến đấu) trong mini app Battleship, kèm **quy tắc phát triển** (rules + hooks) áp dụng khi chỉnh sửa feature này.

## Mục tiêu tính năng

- **Dàn trận**: người chơi đặt 4 tàu lên lưới \(10x10\) trước khi vào trận.
- **Chiến đấu**:
  - **Online**: bắn theo lượt qua realtime events của Supabase.
  - **Bot mode**: chơi offline giả lập (địch là bot), vẫn dùng chung store + UI.
- **Kết thúc trận**: xác định thắng/thua, hiển thị modal, và (online) gọi RPC để lưu kết quả.

## Cấu trúc thư mục liên quan

- `src/features/combat/CombatPage.tsx`: trang chính Combat, điều phối toàn bộ flow.
- `src/features/combat/components/`
  - `GameGrid.tsx`: render lưới nhà/địch, xử lý tương tác chạm/kéo/thả/rotate.
  - `ShipDock.tsx`: “bến tàu” để chọn tàu và bắt đầu kéo đặt.
  - `ShipStatusHeader.tsx`: header khu vực “Hạm đội nhà”.
  - `CombatControls.tsx`: nút auto place + reset (hiện có thể không dùng trực tiếp trong page).
- `src/hooks/useCombatStore.ts`: Zustand store cho toàn bộ state/actions của combat.
- `src/hooks/useSupabase.ts`: API layer + subscribe presence phục vụ online.
- `src/features/combat/constants.ts`: cấu hình hạm đội và kích thước lưới.

## Luồng màn hình (CombatPage)

### 1) Dàn trận (pre-battle)

- Người chơi đặt tàu bằng:
  - **Chọn tàu** ở `ShipDock` → store set `draggingShip`
  - **Kéo trên lưới nhà** (`GameGrid type="home"`) để preview vị trí (ghost)
  - **Thả** để `placeShip()`
  - **Chạm nhanh** lên tàu đã đặt để `rotateShipAt(x, y)`
  - **Nhấn giữ ~250ms** để `pickUpShip(size)` (nhấc tàu lên kéo lại)
- “Sẵn sàng triển khai” khi `placedShips.length === 4`.
- Nút chính:
  - `DÀN TRẬN NGẪU NHIÊN` → `autoPlaceShips()`
  - `XÁC NHẬN TRIỂN KHAI` → `handleStartBattle()`

### 2) Vào trận (battle)

Khi vào trận, UI chia làm 2 phần:

- **Lưới địch**: `GameGrid type="enemy"`
  - Chỉ cho bắn khi `turn === true`
  - Không cho bắn lại ô đã có kết quả (`enemyGrid[y][x] !== "empty"`)
- **Lưới nhà**: `GameGrid type="home"` (hiển thị tàu + trạng thái bị bắn)

### 3) Kết thúc / thoát trận

- Khi có `winner` (`"player"` hoặc `"enemy"`):
  - Hiện `Modal` kết quả và gọi `handleEndSession()` để dọn state local.
  - Với online: `finishGame(gameId, winnerId)` được gọi trong effect cleanup.
- Khi người chơi back/rời trang lúc đang chiến đấu:
  - Chặn popstate và hiển thị `Sheet` xác nhận “rút quân”.
  - Nếu chọn “NHẬN THUA”: dùng luồng “rời trận” (leave room) theo vai trò host/member.

### 4) Rút quân (Surrender) để mở trận mới (không rời phòng)

Khi đã bắt đầu trận (`inBattle === true`), nút **`RÚT QUÂN (SURRENDER)`** dùng để **đầu hàng và reset trận** để 2 bên sắp xếp lại tàu mở trận mới trong cùng phòng.

- **Không ai rời phòng**.
- **Cập nhật thành tích**:
  - Người bấm rút quân (loser): `total_games + 1`
  - Đối thủ (winner): `wins + 1` và `total_games + 1`
- **Reset dữ liệu trận**:
  - dọn `moves` + `game_boards` theo `game_id`
  - cập nhật `games` về `status: "waiting"`, `ready_members: []`, `current_turn: null`, `winner_id: null`
- **UI**:
  - cả hai bên được reset về trạng thái dàn trận ngay trong `CombatPage` (không chuyển trang).

## Chế độ Online (Supabase Realtime)

### Dữ liệu chính (Supabase types)

- **Game**: `src/types/supabase/Game.ts`
  - `status`: `waiting | playing | finished`
  - `current_turn`, `winner_id`, `members`, `ready_members`, ...
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

- Dàn trận:
  - đặt đủ 4 tàu; thử xoay; thử nhấc lên đặt lại; thử auto place.
  - sau khi “XÁC NHẬN TRIỂN KHAI”: không được xoay/nhấc/đặt lại tàu nữa.
- Bot mode:
  - bắn trúng/hụt; bot bắn trả; kết thúc trận hiển thị đúng winner.
- Online:
  - 2 client vào cùng `gameId`; cả hai ready; bắn luân phiên qua realtime.
  - tắt mạng 1 bên để kiểm tra countdown + auto-win sau grace period.
  - đang giao tranh, 1 bên bấm “RÚT QUÂN”: cả hai reset dàn trận, stats cập nhật đúng.
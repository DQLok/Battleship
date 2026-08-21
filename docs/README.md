# Docs — Battleship Telegram Mini App

Đọc `PROJECT_CONTEXT.md` trước (tổng quan end-to-end), rồi [rules.md](./rules.md) (ràng buộc sản phẩm + kỹ thuật). Chi tiết theo feature:

| File | Khi nào đọc |
| --- | --- |
| [rules.md](./rules.md) | Identity guest, BXH, dọn phòng, bootstrap, CSS, TS/React, workflow |
| [identity.md](./identity.md) | User Telegram vs Guest, `profiles`, `ensureSession` |
| [telegram-init.md](./telegram-init.md) | Bootstrap SDK, hash launch params, GitHub Pages |
| [home.md](./home.md) | Home, BXH, thành tích, nhập mã phòng |
| [lobby.md](./lobby.md) | Tạo/join phòng, `room_code`, waiting room |
| [combat.md](./combat.md) | Dàn trận (kéo thả), chiến đấu, realtime |
| [game-lifecycle.md](./game-lifecycle.md) | Schedule `game_lifecycle` (TTL, reconnect, cleanup) |

Khi đổi hành vi: sửa docs cùng lúc với code (rule `.cursor/rules/docs-workflow.mdc`).

# Meta Instant Games — Battleship

Nhánh `main_meta` đóng gói game thành **Facebook Instant Game**. Rule cho agent: `.cursor/rules/meta-instant-games.mdc`.

## Vòng đời SDK

Script SDK vẫn tạo object `FBInstant` trên browser thường, nhưng `initializeAsync()` không bao giờ xong nếu không nằm trong Facebook hoặc Messenger. `src/meta/instant.ts` bỏ qua vòng đời trên localhost, và bỏ qua nếu init không xong trong 4 giây, để UI local vẫn hiện.

Khi có SDK, `src/meta/instant.ts` chạy trước khi render React:

1. `FBInstant.initializeAsync()`
2. `FBInstant.setLoadingProgress(100)` — bundle JS đã tải xong lúc module này chạy
3. `FBInstant.startGameAsync()` — lúc này màn loading của Facebook mới tắt
4. Lưu `FBInstant.player.getID()` cho `getAppUserId()`

Script SDK nằm trước module game trong `index.html`:

`https://connect.facebook.net/en_US/fbinstant.8.0.js`

## Bundle

| File | Việc |
| --- | --- |
| `fbapp-config.json` | Bắt buộc ở **gốc zip**, cạnh `index.html`. Thiếu file hoặc sai hoa/thường thì upload bị từ chối. |
| `index.html` | Entry. Cùng cấp với `fbapp-config.json`, không bọc thêm thư mục cha. |

`fbapp-config.json` hiện tại: `navigation_menu_version` = `NAV_BAR`, `orientation` = `PORTRAIT`.

Đóng gói sau khi đã có `dist/index.html`:

```bash
npm run bundle:meta
```

Script copy `fbapp-config.json` vào `dist/` rồi zip **nội dung** `dist/` thành `battleship-instant.zip`.

Giới hạn zip: 400 MB. Nên giữ bundle lần đầu dưới 5 MB.

Upload: Developer Dashboard → Instant Games → Web Hosting → Upload Version → Stage for Testing. Production chỉ sau khi bấm Push to Production. Tester cần role trên app (Admin, Developer, hoặc Tester).

## Định danh

`FBInstant.player.getID()` là id **riêng game này**, không phải Facebook user id, không dùng để tra người chơi ở game khác.

Tên và ảnh đại diện không đọc trong code game. Muốn hiện profile thì dùng overlay view (iframe do Meta render). Username lưu Supabase trên nhánh này, khi chơi trong Meta, là nhãn local `Player_<id>` — không phải tên Facebook.

Thứ tự `getAppUserId()`: `?mockId=` → `FBInstant.player.getID()` sau `startGameAsync` → id local trong `sessionStorage` (mỗi tab một id). Cùng chuỗi đó ghi vào `profiles.id`, `games.host_id`, `members`, `current_turn`.

## Content Security Policy

CSP của Instant Game cấu hình trên dashboard, không phải thẻ meta trong `index.html`. Mỗi domain: chữ thường, không `https://`, không path, không wildcard.

App này cần:

| Domain | Directive | Vì sao |
| --- | --- | --- |
| `ngitfkvcrkrhwmxyefhu.supabase.co` | `connect-src` | REST + realtime. Chỉ bản prod. Dev dùng Supabase local, xem [env.md](./env.md). |
| `api.dicebear.com` | `img-src` | Avatar giả trong lobby |
| `img.icons8.com` | `img-src` | Avatar mặc định |

## Resources

- [Quick Start](https://developers.facebook.com/documentation/games/build/quick-start) — vòng đời SDK, bundle, test
- [Bundle configuration](https://developers.facebook.com/documentation/games/build/bundle-configuration) — `fbapp-config.json`
- [Content Security Policy](https://developers.facebook.com/documentation/games/build/content-security-policy) — domain ngoài
- [Zero Permissions](https://developers.facebook.com/documentation/games/build/zero-permissions/overview) — tên, ảnh, bạn bè qua overlay
- [Example: current player profile](https://developers.facebook.com/documentation/games/build/zero-permissions/example-game-use-cases)
- [Game performance](https://developers.facebook.com/documentation/games/build/game-performance)
- [Game testing](https://developers.facebook.com/documentation/games/build/game-testing)
- [SDK reference](https://developers.facebook.com/documentation/games/sdk-reference)
- [Create an app](https://developers.facebook.com/apps/) — category Gaming, rồi Set Up Instant Games

Việc nên làm tiếp trên nền tảng (chưa gắn code): leaderboard `FBInstant.getLeaderboardAsync()`, context multiplayer `FBInstant.context`, ads, in-app purchase `FBInstant.payments`.

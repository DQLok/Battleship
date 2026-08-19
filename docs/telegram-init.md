# Telegram Mini App init

## Thứ tự bootstrap (`src/app.ts`)

1. Polyfill (`Object.hasOwn`, `applyPolyfills`).
2. `markRealTelegramAtLoad()` — phát hiện hash/`Telegram.WebApp` **trước** khi mock.
3. `mockTelegramEnvIfNeeded()` — chỉ khi `retrieveLaunchParams()` fail (browser). Production Telegram **không** mock nếu hash còn đủ.
4. `initTelegram()` — `init()` SDK; lỗi bridge **không** blank cả app.
5. `normalizeLaunchUrl()` — **sau** khi SDK đã snapshot launch params.
6. Render `Layout`.

Telegram nhét launch params vào hash `#tgWebAppData=...`. Không được biến hash đó thành route HashRouter **trước** khi SDK đọc. Sau init, hash được đổi thành `#/` cho React Router.

## GitHub Pages

- Vite `base`: build = `/Battleship/`, dev = `/`.
- BotFather Web App URL nên là `https://<user>.github.io/Battleship/` (**có `/` cuối**) để tránh redirect làm mất hash.
- Deploy: `npm run deploy` (nhánh `gh-pages`). CDN GitHub có thể cache HTML ~vài phút.
- Đóng hẳn Mini App rồi mở lại sau deploy; đừng chỉ refresh WebView cũ.

## File

- `src/app.ts`, `src/telegram/init.ts`, `src/telegram/mockEnv.ts`
- `src/utils/user-info.ts` — `normalizeLaunchUrl`, `isTelegramLaunchHash`

# Battleship (Meta Instant Game)

Nhánh `main_meta`. Rule và resource: **[docs/meta.md](docs/meta.md)**.

Game là web app. Trong Facebook / Messenger, `src/meta/instant.ts` gọi `initializeAsync` → `setLoadingProgress` → `startGameAsync` rồi lấy `player.getID()`. Trên browser, mỗi tab một id local (`?mockId=` để cố định). Logic trận và bảng Supabase không đổi.

Env và launcher: **[docs/env.md](docs/env.md)**.

```bash
npm install
npm run dev          # local + Supabase Docker 127.0.0.1:54331
npm run dev:prod     # cùng app, Supabase cloud public
```

Cursor Run and Debug: **Debug Dev (local Supabase)** hoặc **Debug Prod (cloud Supabase)**. Cả hai mở `http://localhost:5173/`. Hai người local: hai tab, hoặc `?mockId=player1` và `?mockId=player2`.

Đóng zip upload:

```bash
npm run bundle:meta
```

`battleship-instant.zip` có `index.html` và `fbapp-config.json` ở gốc. Upload tại Instant Games → Web Hosting, rồi Stage for Testing.

## Resources

- [Quick Start](https://developers.facebook.com/documentation/games/build/quick-start)
- [Bundle configuration](https://developers.facebook.com/documentation/games/build/bundle-configuration)
- [Content Security Policy](https://developers.facebook.com/documentation/games/build/content-security-policy)
- [Zero Permissions](https://developers.facebook.com/documentation/games/build/zero-permissions/overview)
- [SDK reference](https://developers.facebook.com/documentation/games/sdk-reference)
- [App Dashboard](https://developers.facebook.com/apps/)

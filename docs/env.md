# Env — dev local và prod cloud

Một nguồn cho môi trường chạy: `src/config/env.ts`. Vite mode quyết định file env. App từ chối boot nếu dev không trỏ Supabase local, hoặc prod trỏ localhost.

| Launcher | Vite mode | Supabase | App |
| --- | --- | --- | --- |
| Debug Dev / `npm run dev` | `development` | Local Docker | `http://localhost:5173` |
| Debug Prod / `npm run dev:prod` | `production` | Cloud public | `http://localhost:5173` |
| `npm run build` | `production` | Cloud public | zip Instant Games |

Hai launcher dùng cùng cổng 5173. Dừng cái đang chạy trước khi đổi env.

## Debug trong Cursor

Run and Debug:

- **Debug Dev (local Supabase)** — bật stack local rồi mở Chrome debug.
- **Debug Prod (cloud Supabase)** — không đụng Docker, nối cloud.

Terminal tương đương:

```bash
npm run dev
npm run dev:prod
```

`npm start` là alias của `npm run dev`.

## File env

| File | Khi nào Vite đọc |
| --- | --- |
| `.env.development` | mode `development` |
| `.env.production` | mode `production` (`dev:prod`, `build`) |
| `.env.development.local` / `.env.production.local` | override máy mình, không commit |

Không dùng `.env.local`. Vite nạp file đó ở mọi mode, nên bản prod có thể bị trỏ `127.0.0.1`.

Biến:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Dev đang để API local `http://127.0.0.1:54331` và anon key demo của Supabase CLI. Prod đang để project public `https://ngitfkvcrkrhwmxyefhu.supabase.co`.

## Supabase local

Config: `supabase/config.toml`, `project_id = "Battleship"`. `npm run dev` gọi `supabase start` trước Vite.

| Việc | Địa chỉ |
| --- | --- |
| API | `http://127.0.0.1:54331` |
| Postgres | `127.0.0.1:54332` |
| Studio | `http://127.0.0.1:54333` |
| Mail | `http://127.0.0.1:54334` |

Container Docker tên `supabase_*_Battleship`. Data nằm volume cũ của project đó. `supabase start` không xóa data. `supabase db reset` mới chạy lại migration và `supabase/seed.sql`.

Lệnh tay:

```bash
supabase start
supabase status
supabase stop
```

Docker Desktop phải đang chạy. Key thật trên máy: `supabase status`.

## Prod / bundle Meta

`npm run build` và `npm run bundle:meta` bake `.env.production` vào `dist`. Upload zip đó là bản cloud. CSP trên dashboard vẫn cần `ngitfkvcrkrhwmxyefhu.supabase.co` (`connect-src`). Localhost không đi qua CSP của Meta.

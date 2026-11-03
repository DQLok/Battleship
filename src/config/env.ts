export type AppEnv = "dev" | "prod";

const mode = import.meta.env.MODE;

export const appEnv: AppEnv = mode === "production" ? "prod" : "dev";
export const isDev = appEnv === "dev";
export const isProd = appEnv === "prod";

export const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? "").trim();
export const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();

export const isLocalSupabase =
  supabaseUrl.includes("127.0.0.1") || supabaseUrl.includes("localhost");

function assertRuntimeEnv(): void {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      `[env:${appEnv}] Thiếu VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY. Xem docs/env.md.`,
    );
  }

  if (isDev && !isLocalSupabase) {
    throw new Error(
      `[env:dev] Supabase phải là local (http://127.0.0.1:54331). File .env.development đang trỏ ${supabaseUrl}.`,
    );
  }

  if (isProd && (isLocalSupabase || !supabaseUrl.startsWith("https://"))) {
    throw new Error(
      `[env:prod] Supabase phải là cloud public https. File .env.production đang trỏ ${supabaseUrl}.`,
    );
  }
}

assertRuntimeEnv();

if (typeof window !== "undefined") {
  console.info(
    `[env] ${appEnv} → ${isLocalSupabase ? "Supabase local" : "Supabase cloud"} ${supabaseUrl}`,
  );
}

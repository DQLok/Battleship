import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || "";

const isLocalUrl =
  supabaseUrl.includes("127.0.0.1") || supabaseUrl.includes("localhost");

if (import.meta.env.PROD && (!supabaseUrl || isLocalUrl || !supabaseAnonKey)) {
  console.error(
    "[Supabase] Production build thiếu remote env. Tạo `.env.production` với VITE_SUPABASE_URL (https://….supabase.co) và VITE_SUPABASE_ANON_KEY, rồi `npm run deploy` lại."
  );
}

if (import.meta.env.DEV) {
  console.info(
    `[Supabase] ${isLocalUrl || !supabaseUrl ? "LOCAL dev" : "REMOTE"} → ${
      supabaseUrl || "(missing URL)"
    }`
  );
}

// Dev fallback: local Docker. Production must set .env.production (no local fallback).
export const supabase = createClient(
  supabaseUrl ||
    (import.meta.env.DEV ? "http://127.0.0.1:54331" : ""),
  supabaseAnonKey ||
    (import.meta.env.DEV
      ? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
      : "")
);

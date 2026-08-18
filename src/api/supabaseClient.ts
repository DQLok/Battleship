import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || "http://127.0.0.1:54331";

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

if (import.meta.env.DEV) {
  const usingLocal = supabaseUrl.includes("127.0.0.1") || supabaseUrl.includes("localhost");
  console.info(
    `[Supabase] ${usingLocal ? "LOCAL dev" : "REMOTE"} → ${supabaseUrl}`
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

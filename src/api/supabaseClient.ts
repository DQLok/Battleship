import { createClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "@/config/env";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

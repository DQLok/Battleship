// src/api/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// Thay thế các giá trị này bằng thông tin trong Settings > API của Supabase Dashboard
const supabaseUrl = 'https://ngitfkvcrkrhwmxyefhu.supabase.co';
const supabaseAnonKey = 'sb_publishable_rR7p1heaqIWpg9rl-LPgtQ_x8rWK_g0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
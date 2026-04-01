// src/api/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// Thay thế các giá trị này bằng thông tin trong Settings > API của Supabase Dashboard
const supabaseUrl = 'https://your-project-id.supabase.co';
const supabaseAnonKey = 'your-anon-key-here';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
import { createClient } from '@supabase/supabase-js';

// Giá trị dự phòng chuẩn để không bao giờ bị crash app (supabaseUrl is required)
// dù Cloudflare Pages build chưa truyền kịp biến môi trường
const FALLBACK_SUPABASE_URL = 'https://cbumyrnukqqznfizcgwi.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'sb_publishable_9HMdUlPmoyyVvGClSVUG7Q_pYyxErsI';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export default supabase;

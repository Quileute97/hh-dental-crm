import { createClient } from '@supabase/supabase-js';

// Cấu hình Supabase mặc định của dự án HH Dental CRM
const FALLBACK_SUPABASE_URL = 'https://cbumyrnukqqznfizcgwi.supabase.co';
const FALLBACK_ANON_KEY = 'sb_publishable_9HMdUlPmoyyVvGClSVUG7Q_pYyxErsI';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_ANON_KEY;
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export default supabase;

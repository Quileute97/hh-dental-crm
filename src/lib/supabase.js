import { createClient } from '@supabase/supabase-js';

// Cấu hình Supabase cố định của hệ thống phòng khám HH Dental CRM
export const supabaseUrl = 'https://cbumyrnukqqznfizcgwi.supabase.co';
export const supabaseAnonKey = 'sb_publishable_9HMdUlPmoyyVvGClSVUG7Q_pYyxErsI';
export const isSupabaseConfigured = true;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export default supabase;

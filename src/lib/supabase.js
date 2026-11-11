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

function createMemoryStorage() {
  const store = new Map();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
}

/**
 * Tạo Auth client tạm thời (không lưu phiên vào localStorage)
 * Dùng cho Admin khi tạo tài khoản mới trong AccountsView mà không làm mất phiên Admin hiện tại.
 */
export function createEphemeralAuthClient() {
  const storageKey = `hh-dental-ephemeral-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey,
      storage: createMemoryStorage(),
    },
  });
}

export default supabase;

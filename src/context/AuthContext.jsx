import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [role, setRole] = useState('admin'); // 'admin' | 'accountant' | 'frontdesk' | 'partner'
  const [partnerId, setPartnerId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Lắng nghe trạng thái đăng nhập từ Supabase Auth
  useEffect(() => {
    let mounted = true;

    async function getInitialSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          setUser(session.user);
          await loadUserProfile(session.user.id);
        } else {
          // Khởi tạo mặc định admin cho môi trường dev nếu chưa đăng nhập
          setRole('admin');
        }
      } catch (err) {
        console.warn('[AuthContext] Session fetch error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        setUser(session.user);
        await loadUserProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  async function loadUserProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!error && data) {
        setProfile(data);
        setRole(data.role || 'admin');
        setPartnerId(data.partner_id || null);
      }
    } catch (err) {
      console.warn('[AuthContext] Failed to load profile:', err);
    }
  }

  // Đăng nhập bằng Email & Mật khẩu Supabase Auth
  async function login(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      if (data?.user) {
        setUser(data.user);
        await loadUserProfile(data.user.id);
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  // Đăng xuất
  async function logout() {
    try {
      await supabase.auth.signOut();
    } catch (e) {}
    setUser(null);
    setProfile(null);
    setRole('admin');
    setPartnerId(null);
  }

  // Đăng nhập nhanh Demo dành cho Review & Kiểm thử phân quyền
  function demoLogin(targetRole, targetPartnerId = null) {
    setRole(targetRole);
    setPartnerId(targetPartnerId);
    setProfile({
      role: targetRole,
      full_name: targetRole === 'admin' ? 'Quản Trị Viên (Admin)' :
                 targetRole === 'accountant' ? 'Kế Toán Trưởng' :
                 targetRole === 'frontdesk' ? 'Lễ Tân Tiếp Đón' : 'Đối Tác CTV (Bs. Nguyễn Văn A)',
      partner_id: targetPartnerId
    });
    setUser({
      id: 'demo-user-' + targetRole,
      email: `${targetRole}@hhdental.vn`
    });
  }

  const value = {
    user,
    profile,
    role,
    partnerId,
    loading,
    login,
    logout,
    demoLogin,
    isAdmin: role === 'admin',
    isAccountant: role === 'accountant' || role === 'admin',
    isFrontdesk: role === 'frontdesk' || role === 'admin',
    isPartner: role === 'partner'
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}


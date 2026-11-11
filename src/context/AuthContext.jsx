import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { apiProvisionAccountRecords } from '../services/api';
import { sanitizeSelfSignupRole } from '../utils/referral';

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
          await loadUserProfile(session.user);
          if (mounted) setUser(session.user);
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
        await loadUserProfile(session.user);
        if (mounted) setUser(session.user);
      } else {
        setUser(null);
        setProfile(null);
        setRole('admin');
        setPartnerId(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  async function loadUserProfile(userOrId) {
    const userObj = typeof userOrId === 'string' ? null : userOrId;
    const userId = typeof userOrId === 'string' ? userOrId : userOrId?.id;
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        setProfile(data);
        setRole(data.role || 'frontdesk');
        setPartnerId(data.partner_id || null);
        return data;
      }

      // Nếu chưa có dòng profiles (VD: người dùng mới xác nhận email hoặc vừa signUp),
      // tự động cấp phát hồ sơ từ user_metadata một cách an toàn (chỉ cho frontdesk / partner).
      const meta = userObj?.user_metadata || {};
      if (meta.requested_role === 'frontdesk' || meta.requested_role === 'partner') {
        const safeRole = sanitizeSelfSignupRole(meta.requested_role);
        const prov = await apiProvisionAccountRecords({
          userId,
          email: userObj.email || '',
          fullName: meta.full_name || '',
          phone: meta.phone || '',
          role: safeRole,
          partnerCode: meta.partner_code || '',
          parentPartnerId: meta.parent_partner_id || null,
          existingPartnerId: meta.existing_partner_id || null,
          referrerCode: meta.referrer_code || '',
          forceUpdate: false
        });

        if (prov?.ok && prov.profile) {
          setProfile(prov.profile);
          setRole(prov.profile.role || safeRole);
          setPartnerId(prov.profile.partner_id || null);
          return prov.profile;
        }

        const fallbackProfile = {
          user_id: userId,
          role: safeRole,
          partner_id: null,
          full_name: meta.full_name || userObj.email || 'Thành viên mới'
        };
        setProfile(fallbackProfile);
        setRole(safeRole);
        setPartnerId(null);
        return fallbackProfile;
      }
    } catch (err) {
      console.warn('[AuthContext] Failed to load profile:', err);
    }
    return null;
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
        await loadUserProfile(data.user);
        setUser(data.user);
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
    const defaultPartnerId = targetRole === 'partner' ? (targetPartnerId || 'P1') : targetPartnerId;
    setRole(targetRole);
    setPartnerId(defaultPartnerId);
    setProfile({
      role: targetRole,
      full_name: targetRole === 'admin' ? 'Quản Trị Viên (Admin)' :
                 targetRole === 'accountant' ? 'Kế Toán Trưởng' :
                 targetRole === 'frontdesk' ? 'Lễ Tân Tiếp Đón' : 'Đối Tác CTV (Bs. Nguyễn Văn A)',
      partner_id: defaultPartnerId
    });
    setUser({
      id: 'demo-user-' + targetRole,
      email: `${targetRole}@hhdental.vn`
    });
  }

  async function refreshProfile() {
    if (!user) return null;
    return await loadUserProfile(user);
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
    refreshProfile,
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


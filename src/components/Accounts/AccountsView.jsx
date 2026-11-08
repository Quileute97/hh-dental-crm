import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ShieldCheck, 
  UserCheck, 
  Key, 
  Edit3, 
  Save, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  ExternalLink,
  PlusCircle
} from 'lucide-react';
import { apiFetchProfiles, apiUpdateProfile } from '../../services/api';

export default function AccountsView({ partners = [], showToast = () => {} }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editForm, setEditForm] = useState({ role: 'frontdesk', partnerId: '', fullName: '' });
  const [isLinkingNew, setIsLinkingNew] = useState(false);
  const [newProfileForm, setNewProfileForm] = useState({ userId: '', role: 'frontdesk', partnerId: '', fullName: '' });

  // Load profiles
  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    setLoading(true);
    const data = await apiFetchProfiles();
    setProfiles(data);
    setLoading(false);
  }

  const partnerMap = new Map((partners || []).map(p => [p.id, p]));

  function startEdit(profile) {
    setEditingUserId(profile.user_id);
    setEditForm({
      role: profile.role || 'frontdesk',
      partnerId: profile.partner_id || '',
      fullName: profile.full_name || ''
    });
  }

  function cancelEdit() {
    setEditingUserId(null);
  }

  async function handleSaveEdit(userId) {
    const success = await apiUpdateProfile(userId, {
      role: editForm.role,
      partner_id: editForm.role === 'partner' ? editForm.partnerId : null,
      full_name: editForm.fullName
    });

    if (success) {
      showToast('Đã cập nhật vai trò & hồ sơ tài khoản thành công!');
      setEditingUserId(null);
      await loadProfiles();
    } else {
      showToast('Lỗi khi lưu thay đổi hồ sơ tài khoản.');
    }
  }

  async function handleCreateProfile(e) {
    e.preventDefault();
    if (!newProfileForm.userId.trim()) {
      showToast('Vui lòng nhập User UUID từ Supabase Auth.');
      return;
    }

    const success = await apiUpdateProfile(newProfileForm.userId.trim(), {
      role: newProfileForm.role,
      partner_id: newProfileForm.role === 'partner' ? newProfileForm.partnerId : null,
      full_name: newProfileForm.fullName
    });

    if (success) {
      showToast('Đã liên kết hồ sơ phân quyền cho tài khoản mới thành công!');
      setIsLinkingNew(false);
      setNewProfileForm({ userId: '', role: 'frontdesk', partnerId: '', fullName: '' });
      await loadProfiles();
    } else {
      showToast('Lỗi khi liên kết tài khoản.');
    }
  }

  const roleBadges = {
    admin: { label: 'Quản trị viên (Admin)', class: 'bg-purple-50 text-purple-700 border-purple-200' },
    accountant: { label: 'Kế toán (Accountant)', class: 'bg-blue-50 text-blue-700 border-blue-200' },
    frontdesk: { label: 'Lễ tân (Frontdesk)', class: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    partner: { label: 'Đối tác / CTV (Partner)', class: 'bg-amber-50 text-amber-700 border-amber-200' }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-600" />
            Tài Khoản & Phân Quyền Hệ Thống
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý vai trò (roles) và ánh xạ hồ sơ người dùng trong cơ sở dữ liệu Supabase (<code>public.profiles</code>)
          </p>
        </div>

        <button
          onClick={() => setIsLinkingNew(!isLinkingNew)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          {isLinkingNew ? 'Đóng form liên kết' : 'Gắn quyền User mới'}
        </button>
      </div>

      {/* Info notice about Supabase Auth User Creation */}
      <div className="p-4 rounded-xl border border-sky-200 bg-sky-50/60 flex items-start gap-3 text-xs text-slate-700">
        <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-sky-950">
            Quy trình cấp tài khoản đăng nhập (Authentication)
          </p>
          <p className="text-slate-600 leading-relaxed">
            Để đảm bảo an toàn tuyệt đối, tài khoản đăng nhập (email & mật khẩu) được tạo trực tiếp tại{' '}
            <a 
              href="https://supabase.com/dashboard/project/cbumyrnukqqznfizcgwi/auth/users" 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-sky-700 hover:underline"
            >
              Supabase Dashboard &rarr; Authentication &rarr; Users <ExternalLink className="w-3 h-3" />
            </a>. Sau đó, quản trị viên chỉ cần lấy <strong>User UID</strong> dán vào hệ thống để gán vai trò tương ứng bên dưới.
          </p>
        </div>
      </div>

      {/* Form linking new user UUID */}
      {isLinkingNew && (
        <form onSubmit={handleCreateProfile} className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Liên kết hồ sơ vai trò cho tài khoản Supabase Auth
            </h3>
            <button type="button" onClick={() => setIsLinkingNew(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700">User UID (Từ Supabase Auth) *</label>
              <input
                type="text"
                required
                placeholder="VD: 550e8400-e29b-41d4-a716-..."
                value={newProfileForm.userId}
                onChange={e => setNewProfileForm({ ...newProfileForm, userId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-[11px] text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Họ và tên hiển thị</label>
              <input
                type="text"
                placeholder="VD: Nguyễn Văn A"
                value={newProfileForm.fullName}
                onChange={e => setNewProfileForm({ ...newProfileForm, fullName: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700">Vai trò phân quyền (Role) *</label>
              <select
                value={newProfileForm.role}
                onChange={e => setNewProfileForm({ ...newProfileForm, role: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="admin">Quản trị viên (admin)</option>
                <option value="accountant">Kế toán (accountant)</option>
                <option value="frontdesk">Lễ tân (frontdesk)</option>
                <option value="partner">Đối tác / CTV (partner)</option>
              </select>
            </div>

            {newProfileForm.role === 'partner' && (
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Gắn với Đối tác *</label>
                <select
                  required
                  value={newProfileForm.partnerId}
                  onChange={e => setNewProfileForm({ ...newProfileForm, partnerId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="">-- Chọn đối tác --</option>
                  {partners.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsLinkingNew(false)}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs transition-colors"
            >
              Lưu hồ sơ
            </button>
          </div>
        </form>
      )}

      {/* Profiles Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                <th className="py-3 px-4">Tài khoản / Tên hiển thị</th>
                <th className="py-3 px-4">User UID (Supabase Auth)</th>
                <th className="py-3 px-4">Vai trò (Role)</th>
                <th className="py-3 px-4">Đối tác liên kết (Partner)</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-400">
                    Đang tải danh sách hồ sơ tài khoản...
                  </td>
                </tr>
              ) : profiles.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-400">
                    Chưa có hồ sơ người dùng nào trong bảng <code>profiles</code>.
                  </td>
                </tr>
              ) : (
                profiles.map(prof => {
                  const isEditing = editingUserId === prof.user_id;
                  const partner = prof.partner_id ? partnerMap.get(prof.partner_id) : null;
                  const badge = roleBadges[prof.role] || { label: prof.role, class: 'bg-slate-100 text-slate-700 border-slate-200' };

                  return (
                    <tr key={prof.user_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.fullName}
                            onChange={e => setEditForm({ ...editForm, fullName: e.target.value })}
                            placeholder="Họ và tên"
                            className="px-2 py-1 border border-slate-300 rounded text-xs w-full max-w-[200px]"
                          />
                        ) : (
                          <div className="font-semibold text-slate-900">
                            {prof.full_name || '—'}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono text-[11px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 select-all" title={prof.user_id}>
                          {prof.user_id}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {isEditing ? (
                          <select
                            value={editForm.role}
                            onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                            className="px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                          >
                            <option value="admin">Quản trị viên (admin)</option>
                            <option value="accountant">Kế toán (accountant)</option>
                            <option value="frontdesk">Lễ tân (frontdesk)</option>
                            <option value="partner">Đối tác (partner)</option>
                          </select>
                        ) : (
                          <span className={`inline-block px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${badge.class}`}>
                            {badge.label}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {isEditing ? (
                          editForm.role === 'partner' ? (
                            <select
                              value={editForm.partnerId}
                              onChange={e => setEditForm({ ...editForm, partnerId: e.target.value })}
                              className="px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                            >
                              <option value="">-- Chưa gắn --</option>
                              {partners.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.code})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-slate-400 font-mono">—</span>
                          )
                        ) : (
                          partner ? (
                            <span className="font-medium text-slate-700">
                              {partner.name} <span className="font-mono text-[11px] text-slate-400">({partner.code})</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono">—</span>
                          )
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleSaveEdit(prof.user_id)}
                              className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                              title="Lưu"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1.5 text-slate-500 hover:bg-slate-100 rounded transition-colors"
                              title="Hủy"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(prof)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                            Sửa quyền
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Tổng số: <strong>{profiles.length}</strong> tài khoản đã phân quyền</span>
          <span>Bảo mật bởi PostgreSQL RLS <code>profiles_write</code></span>
        </div>
      </div>
    </div>
  );
}

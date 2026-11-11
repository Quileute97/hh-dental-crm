import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Edit3,
  Save,
  X,
  Info,
  ExternalLink,
  PlusCircle,
  UserPlus,
  Link2,
  Check,
  CheckCircle2,
  RefreshCw,
  Stethoscope,
  ShieldCheck,
  Search,
  Copy
} from 'lucide-react';
import {
  apiFetchProfiles,
  apiUpdateProfile,
  apiCreateAccountWithRole
} from '../../services/api';
import {
  generatePartnerRefCode,
  buildPartnerReferralLink,
  getRootF0Partner
} from '../../utils/referral';

export default function AccountsView({
  partners = [],
  showToast = () => {},
  onRefreshData = null,
  onCopyReferralLink = null
}) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editForm, setEditForm] = useState({ role: 'frontdesk', partnerId: '', fullName: '' });

  // Panel tạo / liên kết tài khoản
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState('create'); // 'create' | 'link_uid'
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createdBanner, setCreatedBanner] = useState(null);

  // Form tạo tài khoản mới với tick phân quyền
  const [createForm, setCreateForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phone: '',
    role: 'frontdesk',
    partnerAttachMode: 'new', // 'new' | 'existing'
    partnerCode: generatePartnerRefCode(),
    parentPartnerId: '',
    existingPartnerId: ''
  });
  const [parentSearch, setParentSearch] = useState('');

  // Form gắn UID cũ
  const [newProfileForm, setNewProfileForm] = useState({
    userId: '',
    role: 'frontdesk',
    partnerId: '',
    fullName: ''
  });

  useEffect(() => {
    loadProfiles();
  }, []);

  async function loadProfiles() {
    setLoading(true);
    const data = await apiFetchProfiles();
    setProfiles(data);
    setLoading(false);
  }

  const partnerMap = useMemo(() => new Map((partners || []).map(p => [p.id, p])), [partners]);

  const filteredParentPartners = useMemo(() => {
    const q = parentSearch.trim().toLowerCase();
    const sorted = [...(partners || [])].sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0));
    if (!q) return sorted;
    return sorted.filter(
      p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.code || '').toLowerCase().includes(q) ||
        (p.phone || '').toLowerCase().includes(q)
    );
  }, [partners, parentSearch]);

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
      showToast('Lỗi khi lưu thay đổi hồ sơ tài khoản.', 'error');
    }
  }

  async function handleCreateAccount(e) {
    e.preventDefault();
    setCreateError('');
    setCreatedBanner(null);

    if (!createForm.fullName.trim()) {
      setCreateError('Vui lòng nhập họ và tên hiển thị.');
      return;
    }
    if (!createForm.email.trim()) {
      setCreateError('Vui lòng nhập địa chỉ email.');
      return;
    }
    if (createForm.password.length < 6) {
      setCreateError('Mật khẩu phải có tối thiểu 6 ký tự.');
      return;
    }
    if (createForm.role === 'partner') {
      if (createForm.partnerAttachMode === 'existing' && !createForm.existingPartnerId) {
        setCreateError('Vui lòng chọn hồ sơ đối tác cần gắn.');
        return;
      }
      if (createForm.partnerAttachMode === 'new' && !createForm.phone.trim()) {
        setCreateError('Đối tác / CTV mới cần nhập số điện thoại liên hệ.');
        return;
      }
    }

    setCreating(true);
    const res = await apiCreateAccountWithRole({
      email: createForm.email,
      password: createForm.password,
      fullName: createForm.fullName,
      phone: createForm.phone,
      role: createForm.role,
      partnerCode: createForm.role === 'partner' && createForm.partnerAttachMode === 'new'
        ? createForm.partnerCode
        : '',
      parentPartnerId: createForm.role === 'partner' && createForm.partnerAttachMode === 'new'
        ? (createForm.parentPartnerId || null)
        : null,
      existingPartnerId: createForm.role === 'partner' && createForm.partnerAttachMode === 'existing'
        ? createForm.existingPartnerId
        : null,
      useEphemeralClient: true
    });
    setCreating(false);

    if (!res.ok) {
      setCreateError(res.error || 'Không thể tạo tài khoản.');
      return;
    }

    const linkedPartner =
      res.partner ||
      (createForm.role === 'partner' && createForm.existingPartnerId
        ? partnerMap.get(createForm.existingPartnerId)
        : null);

    setCreatedBanner({
      email: createForm.email.trim().toLowerCase(),
      fullName: createForm.fullName.trim(),
      role: createForm.role,
      requiresEmailConfirmation: res.requiresEmailConfirmation,
      partner: linkedPartner
    });

    showToast(`Đã tạo tài khoản ${createForm.fullName.trim()} (${createForm.role}) thành công!`);

    setCreateForm({
      fullName: '',
      email: '',
      password: '',
      phone: '',
      role: createForm.role,
      partnerAttachMode: 'new',
      partnerCode: generatePartnerRefCode(),
      parentPartnerId: '',
      existingPartnerId: ''
    });

    await loadProfiles();
    if (onRefreshData) {
      await onRefreshData();
    }
  }

  async function handleLinkExistingUid(e) {
    e.preventDefault();
    if (!newProfileForm.userId.trim()) {
      showToast('Vui lòng nhập User UUID từ Supabase Auth.', 'error');
      return;
    }

    const success = await apiUpdateProfile(newProfileForm.userId.trim(), {
      role: newProfileForm.role,
      partner_id: newProfileForm.role === 'partner' ? newProfileForm.partnerId : null,
      full_name: newProfileForm.fullName
    });

    if (success) {
      showToast('Đã liên kết hồ sơ phân quyền cho tài khoản thành công!');
      setIsPanelOpen(false);
      setNewProfileForm({ userId: '', role: 'frontdesk', partnerId: '', fullName: '' });
      await loadProfiles();
    } else {
      showToast('Lỗi khi liên kết tài khoản.', 'error');
    }
  }

  async function handleQuickCopyLink(partner) {
    if (!partner?.code) return;
    if (onCopyReferralLink) {
      await onCopyReferralLink(partner);
      return;
    }
    const url = buildPartnerReferralLink(partner.code);
    try {
      await navigator.clipboard.writeText(url);
      showToast(`Đã sao chép Link Giới Thiệu của ${partner.name}: ${url}`);
    } catch {
      showToast(`Link Giới Thiệu: ${url}`);
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
            Tài Khoản &amp; Phân Quyền Hệ Thống
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tạo tài khoản với tick phân quyền ngay từ đầu, gắn cây F0 và quản lý phân quyền (<code>public.profiles</code>)
          </p>
        </div>

        <button
          onClick={() => {
            setIsPanelOpen(!isPanelOpen);
            setCreateError('');
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          {isPanelOpen ? 'Đóng khung tạo tài khoản' : 'Tạo tài khoản mới'}
        </button>
      </div>

      {/* Created Referral Banner */}
      {createdBanner && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-emerald-900">
                Đã tạo tài khoản {createdBanner.fullName} ({createdBanner.email}) — Vai trò: {createdBanner.role}
              </p>
              {createdBanner.requiresEmailConfirmation && (
                <p className="text-emerald-800">
                  Supabase Auth đã gửi email kích hoạt tới người dùng (hoặc Admin có thể tắt Confirm Email trong Supabase Auth để dùng ngay).
                </p>
              )}
              {createdBanner.partner?.code && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-emerald-800 font-medium">Link Giới Thiệu Đối Tác:</span>
                  <code className="px-2 py-0.5 bg-white rounded border border-emerald-200 text-emerald-900 font-mono text-[11px]">
                    {buildPartnerReferralLink(createdBanner.partner.code)}
                  </code>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {createdBanner.partner?.code && (
              <button
                type="button"
                onClick={() => handleQuickCopyLink(createdBanner.partner)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Sao chép Link GT</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setCreatedBanner(null)}
              className="p-1 text-emerald-700 hover:bg-emerald-100 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Creation & UID Linking Panel */}
      {isPanelOpen && (
        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="inline-flex p-1 bg-slate-100 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPanelTab('create')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                  panelTab === 'create'
                    ? 'bg-white text-sky-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Tạo tài khoản mới (Tick phân quyền)</span>
              </button>
              <button
                type="button"
                onClick={() => setPanelTab('link_uid')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                  panelTab === 'link_uid'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Gắn User UID có sẵn</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsPanelOpen(false)}
              className="text-slate-400 hover:text-slate-600 self-end sm:self-auto"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {panelTab === 'create' ? (
            <form onSubmit={handleCreateAccount} className="space-y-4 text-xs">
              {createError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700">
                  {createError}
                </div>
              )}

              {/* Tick phân quyền ngay từ đầu */}
              <div className="space-y-2">
                <label className="block font-semibold text-slate-700">
                  1. Tick chọn phân quyền tài khoản ngay từ đầu <span className="text-rose-500">*</span>
                </label>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Tick Lễ tân */}
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, role: 'frontdesk' })}
                    className={`p-3 rounded-lg border text-left transition-all flex items-start gap-2.5 ${
                      createForm.role === 'frontdesk'
                        ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span
                      className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                        createForm.role === 'frontdesk'
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'bg-white border-slate-300'
                      }`}
                    >
                      {createForm.role === 'frontdesk' && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Lễ tân (Frontdesk)</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Tiếp đón khách hàng, gắn nguồn CTV, ghi nhận lượt khám &amp; doanh thu
                      </p>
                    </div>
                  </button>

                  {/* Tick Cộng tác viên / Đối tác */}
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, role: 'partner' })}
                    className={`p-3 rounded-lg border text-left transition-all flex items-start gap-2.5 ${
                      createForm.role === 'partner'
                        ? 'border-sky-600 bg-sky-50/70 ring-1 ring-sky-600'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span
                      className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                        createForm.role === 'partner'
                          ? 'bg-sky-600 border-sky-600 text-white'
                          : 'bg-white border-slate-300'
                      }`}
                    >
                      {createForm.role === 'partner' && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-sky-600" />
                        <span>Cộng tác viên / Đối tác (Partner)</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Tự động cấp Link Giới Thiệu &amp; gắn vào cây đối tác F0 tương ứng
                      </p>
                    </div>
                  </button>
                </div>

                {/* Vai trò quản trị nội bộ bổ sung cho Admin */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[11px] text-slate-500">Hoặc vai trò nội bộ khác:</span>
                  {[
                    { id: 'accountant', label: 'Kế toán (accountant)' },
                    { id: 'admin', label: 'Quản trị viên (admin)' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, role: opt.id })}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-medium transition-colors ${
                        createForm.role === opt.id
                          ? 'border-purple-600 bg-purple-50 text-purple-800 font-semibold'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span
                        className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                          createForm.role === opt.id
                            ? 'bg-purple-600 border-purple-600 text-white'
                            : 'bg-white border-slate-300'
                        }`}
                      >
                        {createForm.role === opt.id && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Thông tin đăng nhập */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">
                    Họ và tên <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Trần Minh Tâm"
                    value={createForm.fullName}
                    onChange={e => setCreateForm({ ...createForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">
                    Email đăng nhập <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="ten@hhdental.vn"
                    value={createForm.email}
                    onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">
                    Mật khẩu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Tối thiểu 6 ký tự"
                    value={createForm.password}
                    onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">
                    Số điện thoại {createForm.role === 'partner' && createForm.partnerAttachMode === 'new' && <span className="text-rose-500">*</span>}
                  </label>
                  <input
                    type="tel"
                    required={createForm.role === 'partner' && createForm.partnerAttachMode === 'new'}
                    placeholder="09xx xxx xxx"
                    value={createForm.phone}
                    onChange={e => setCreateForm({ ...createForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Thiết lập cây đối tác nếu chọn CTV / Đối tác */}
              {createForm.role === 'partner' && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-slate-800">
                      2. Gắn vào Cây Đối Tác F0 &amp; Cấp mã Giới thiệu
                    </span>
                    <div className="inline-flex p-0.5 bg-white border border-slate-200 rounded-md text-[11px]">
                      <button
                        type="button"
                        onClick={() => setCreateForm({ ...createForm, partnerAttachMode: 'new' })}
                        className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                          createForm.partnerAttachMode === 'new'
                            ? 'bg-sky-600 text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Tạo CTV mới trong cây
                      </button>
                      <button
                        type="button"
                        onClick={() => setCreateForm({ ...createForm, partnerAttachMode: 'existing' })}
                        className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                          createForm.partnerAttachMode === 'existing'
                            ? 'bg-sky-600 text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Gắn vào Đối tác đã có
                      </button>
                    </div>
                  </div>

                  {createForm.partnerAttachMode === 'new' ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-700">Mã REF (Link giới thiệu)</label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            required
                            value={createForm.partnerCode}
                            onChange={e => setCreateForm({ ...createForm, partnerCode: e.target.value.toUpperCase() })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono uppercase bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                          />
                          <button
                            type="button"
                            onClick={() => setCreateForm({ ...createForm, partnerCode: generatePartnerRefCode() })}
                            className="p-2 border border-slate-300 bg-white hover:bg-slate-100 rounded-lg text-slate-600"
                            title="Sinh mã mới"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="md:col-span-2 space-y-1">
                        <label className="font-semibold text-slate-700">
                          Thuộc Cấp trên / Cây Đối tác F0
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                          <div className="sm:col-span-2 relative">
                            <input
                              type="text"
                              value={parentSearch}
                              onChange={e => setParentSearch(e.target.value)}
                              placeholder="Tìm nhanh tên, mã REF, SĐT..."
                              className="w-full pl-8 pr-2 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                            />
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          </div>
                          <select
                            value={createForm.parentPartnerId}
                            onChange={e => setCreateForm({ ...createForm, parentPartnerId: e.target.value })}
                            className="sm:col-span-3 px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                          >
                            <option value="">Không có — Là Đối tác Gốc (F0 • Độ sâu 0)</option>
                            {filteredParentPartners.map(p => {
                              const { root } = getRootF0Partner(p.id, partners);
                              const f0Hint = root && root.id !== p.id ? ` • Cây F0: ${root.name}` : '';
                              return (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.code}) — Tuyến {p.depth ?? 0}{f0Hint}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700">
                        Chọn Đối tác hiện có để liên kết tài khoản <span className="text-rose-500">*</span>
                      </label>
                      <select
                        required
                        value={createForm.existingPartnerId}
                        onChange={e => setCreateForm({ ...createForm, existingPartnerId: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                      >
                        <option value="">-- Chọn đối tác --</option>
                        {partners.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.code}) — Độ sâu {p.depth ?? 0}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                  Tạo bằng Client tạm thời — không làm gián đoạn phiên Admin hiện tại.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPanelOpen(false)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-60 rounded-lg shadow-xs transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{creating ? 'Đang tạo tài khoản...' : 'Tạo tài khoản & Phân quyền'}</span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleLinkExistingUid} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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
                    <option value="frontdesk">Lễ tân (frontdesk)</option>
                    <option value="partner">Đối tác / CTV (partner)</option>
                    <option value="accountant">Kế toán (accountant)</option>
                    <option value="admin">Quản trị viên (admin)</option>
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
                  onClick={() => setIsPanelOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs transition-colors"
                >
                  Lưu hồ sơ UID
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Info notice */}
      <div className="p-4 rounded-xl border border-sky-200 bg-sky-50/60 flex items-start gap-3 text-xs text-slate-700">
        <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-sky-950">
            Cơ chế tạo tài khoản &amp; Link Giới Thiệu Đối Tác (Referral Link)
          </p>
          <p className="text-slate-600 leading-relaxed">
            Admin có thể nhấn <strong>&ldquo;Tạo tài khoản mới&rdquo;</strong> để tick phân quyền Lễ tân / CTV trực tiếp, hoặc sao chép <strong>Link Giới Thiệu</strong> của từng đối tác để người dùng tự đăng ký và tự động gắn vào cây đối tác F0 tương ứng. Ngoài ra vẫn có thể quản lý user gốc tại{' '}
            <a
              href="https://supabase.com/dashboard/project/cbumyrnukqqznfizcgwi/auth/users"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-sky-700 hover:underline"
            >
              Supabase Auth <ExternalLink className="w-3 h-3" />
            </a>.
          </p>
        </div>
      </div>

      {/* Profiles Table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                <th className="py-3 px-4">Tài khoản / Tên hiển thị</th>
                <th className="py-3 px-4">User UID (Supabase Auth)</th>
                <th className="py-3 px-4">Vai trò (Role)</th>
                <th className="py-3 px-4">Đối tác liên kết &amp; Link Giới Thiệu</th>
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
                  const badge = roleBadges[prof.role] || {
                    label: prof.role,
                    class: 'bg-slate-100 text-slate-700 border-slate-200'
                  };

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
                        <span
                          className="font-mono text-[11px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 select-all"
                          title={prof.user_id}
                        >
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
                        ) : partner ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-slate-700">
                              {partner.name} <span className="font-mono text-[11px] text-slate-400">({partner.code})</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQuickCopyLink(partner)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded transition-colors"
                              title={`Sao chép Link giới thiệu của ${partner.name}`}
                            >
                              <Link2 className="w-3 h-3" />
                              <span>Copy Link GT</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono">—</span>
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

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Lock,
  Mail,
  ArrowRight,
  X,
  UserPlus,
  LogIn,
  User,
  Phone,
  Link2,
  GitFork,
  Check,
  CheckCircle2,
  AlertTriangle,
  Stethoscope,
  Users
} from 'lucide-react';
import { apiCreateAccountWithRole, apiResolveReferralCode } from '../../services/api';
import {
  getReferralCodeFromUrl,
  getSavedReferralCode,
  saveReferralCode,
  clearSavedReferralCode,
  stripReferralFromUrl,
  normalizeRefCode,
  sanitizeSelfSignupRole
} from '../../utils/referral';

export default function LoginScreen({ onLoginSuccess, isModal = false, onClose }) {
  const { login, refreshProfile } = useAuth();

  const initialRef = getReferralCodeFromUrl() || getSavedReferralCode();

  const [mode, setMode] = useState(initialRef ? 'register' : 'login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  // Tick phân quyền ngay từ đầu cho đăng ký mới ('partner' | 'frontdesk')
  const [selectedRole, setSelectedRole] = useState('partner');

  // State cho Link Referral (F0 / Cấp trên)
  const [urlRefCode, setUrlRefCode] = useState(initialRef);
  const [manualRefInput, setManualRefInput] = useState(initialRef);
  const [resolvedReferrer, setResolvedReferrer] = useState(null);
  const [resolvingRef, setResolvingRef] = useState(Boolean(initialRef));
  const [refLookupError, setRefLookupError] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registerSuccessInfo, setRegisterSuccessInfo] = useState(null);

  // Tự động tra cứu mã giới thiệu khi mở trang từ ?ref=...
  useEffect(() => {
    let cancelled = false;
    async function resolveInitialRef() {
      const urlCode = getReferralCodeFromUrl();
      const effectiveCode = urlCode || getSavedReferralCode();
      if (!effectiveCode) {
        setResolvingRef(false);
        return;
      }

      if (urlCode) {
        saveReferralCode(urlCode);
      }

      setUrlRefCode(effectiveCode);
      setManualRefInput(effectiveCode);
      setMode('register');
      setSelectedRole('partner');
      setResolvingRef(true);
      setRefLookupError('');

      const partnerInfo = await apiResolveReferralCode(effectiveCode);
      if (cancelled) return;
      setResolvingRef(false);

      if (partnerInfo) {
        setResolvedReferrer(partnerInfo);
      } else {
        setResolvedReferrer(null);
        setRefLookupError(`Mã giới thiệu "${effectiveCode}" không tồn tại hoặc đang tạm dừng hoạt động.`);
      }
    }

    resolveInitialRef();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLookupManualRef(codeToCheck) {
    const clean = normalizeRefCode(codeToCheck ?? manualRefInput);
    if (!clean) {
      setResolvedReferrer(null);
      setRefLookupError('');
      return;
    }

    setResolvingRef(true);
    setRefLookupError('');
    const info = await apiResolveReferralCode(clean);
    setResolvingRef(false);

    if (info) {
      setResolvedReferrer(info);
      setRefLookupError('');
    } else {
      setResolvedReferrer(null);
      setRefLookupError(`Không tìm thấy đối tác đang hoạt động với mã "${clean}".`);
    }
  }

  function handleClearReferral() {
    clearSavedReferralCode();
    stripReferralFromUrl();
    setUrlRefCode('');
    setManualRefInput('');
    setResolvedReferrer(null);
    setRefLookupError('');
  }

  function handleSwitchMode(nextMode) {
    setMode(nextMode);
    setError('');
    setRegisterSuccessInfo(null);
  }

  async function handleLoginSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await login(email, password);
    setLoading(false);

    if (res.ok) {
      if (onLoginSuccess) onLoginSuccess();
    } else {
      setError(res.error || 'Email hoặc mật khẩu không chính xác.');
    }
  }

  async function handleRegisterSubmit(e) {
    e.preventDefault();
    setError('');
    setRegisterSuccessInfo(null);

    const safeRole = resolvedReferrer && urlRefCode
      ? 'partner'
      : sanitizeSelfSignupRole(selectedRole);

    if (!fullName.trim()) {
      setError('Vui lòng nhập họ và tên.');
      return;
    }
    if (safeRole === 'partner' && !phone.trim()) {
      setError('Đối tác / CTV vui lòng nhập số điện thoại liên hệ.');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu phải có tối thiểu 6 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp.');
      return;
    }

    const activeRefCode = safeRole === 'partner'
      ? normalizeRefCode(resolvedReferrer?.code || manualRefInput || urlRefCode)
      : '';

    if (safeRole === 'partner' && activeRefCode && !resolvedReferrer && refLookupError) {
      setError(refLookupError);
      return;
    }

    setLoading(true);
    const res = await apiCreateAccountWithRole({
      email,
      password,
      fullName,
      phone,
      role: safeRole,
      parentPartnerId: safeRole === 'partner' ? (resolvedReferrer?.id || null) : null,
      referrerCode: safeRole === 'partner' ? activeRefCode : '',
      useEphemeralClient: false
    });
    setLoading(false);

    if (!res.ok) {
      setError(res.error || 'Không thể đăng ký tài khoản. Vui lòng thử lại.');
      return;
    }

    // Dọn dẹp mã referral sau khi đăng ký thành công
    clearSavedReferralCode();
    stripReferralFromUrl();

    if (res.requiresEmailConfirmation) {
      setRegisterSuccessInfo({
        email: email.trim().toLowerCase(),
        role: safeRole,
        referrer: resolvedReferrer || res.resolvedReferrer || null
      });
      return;
    }

    // Đã tự động đăng nhập ngay sau khi signUp
    await refreshProfile?.();
    if (onLoginSuccess) onLoginSuccess();
  }

  const containerClass = isModal
    ? 'relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 sm:p-8'
    : 'min-h-screen bg-slate-50 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8';

  const wrapperClass = isModal ? '' : 'mt-5 sm:mx-auto sm:w-full sm:max-w-lg';
  const cardClass = isModal
    ? 'space-y-4'
    : 'bg-white py-6 px-5 shadow-sm border border-slate-200 rounded-xl sm:px-8 space-y-5';

  const isLockedByUrlReferral = Boolean(urlRefCode && resolvedReferrer);

  return (
    <div className={containerClass}>
      {isModal && onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      <div className={isModal ? 'text-center mb-5' : 'sm:mx-auto sm:w-full sm:max-w-lg text-center'}>
        <img
          src="/logo.png"
          alt="HH Dental Clinic"
          className="mx-auto h-12 w-auto object-contain mix-blend-multiply"
        />
        <h2 className="mt-2 text-center text-lg font-bold tracking-tight text-slate-900">
          {mode === 'login' ? 'Đăng Nhập Hệ Thống' : 'Đăng Ký Tài Khoản Mới'}
        </h2>
        <p className="mt-0.5 text-center text-xs text-slate-500">
          HH Dental Clinic &bull; Cổng Quản Trị &amp; Đối Tác
        </p>
      </div>

      <div className={wrapperClass}>
        <div className={cardClass}>
          {/* Tab chuyển Đăng nhập / Đăng ký */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => handleSwitchMode('login')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-md transition-colors ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng nhập</span>
            </button>
            <button
              type="button"
              onClick={() => handleSwitchMode('register')}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-md transition-colors ${
                mode === 'register'
                  ? 'bg-white text-sky-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Đăng ký tài khoản</span>
              {urlRefCode && (
                <span className="ml-0.5 px-1.5 py-0.2 text-[9px] bg-sky-100 text-sky-700 rounded-full border border-sky-200">
                  Link GT
                </span>
              )}
            </button>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* MÀN HÌNH ĐĂNG NHẬP */}
          {mode === 'login' && (
            <form className="space-y-4" onSubmit={handleLoginSubmit}>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Địa chỉ Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="admin@hhdental.vn"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mật khẩu
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-md shadow-xs text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-60 focus:outline-none transition-colors"
              >
                <span>{loading ? 'Đang xác thực...' : 'Đăng nhập hệ thống'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          {/* MÀN HÌNH ĐĂNG KÝ THÀNH CÔNG (CHỜ XÁC NHẬN EMAIL) */}
          {mode === 'register' && registerSuccessInfo && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-3">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-emerald-900 text-sm">
                    Đăng ký tài khoản thành công!
                  </h4>
                  <p className="text-emerald-800 leading-relaxed">
                    Tài khoản <strong>{registerSuccessInfo.email}</strong> đã được khởi tạo với vai trò{' '}
                    <strong>
                      {registerSuccessInfo.role === 'frontdesk'
                        ? 'Lễ tân (Frontdesk)'
                        : 'Cộng tác viên / Đối tác'}
                    </strong>
                    {registerSuccessInfo.referrer && (
                      <>
                        {' '}và đã gắn vào cây đối tác của{' '}
                        <strong>
                          {registerSuccessInfo.referrer.f0Name || registerSuccessInfo.referrer.name}
                        </strong>
                        .
                      </>
                    )}
                  </p>
                  <p className="text-emerald-700">
                    Vui lòng kiểm tra hộp thư email của bạn để bấm xác nhận kích hoạt, sau đó đăng nhập lại.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setRegisterSuccessInfo(null);
                  setMode('login');
                }}
                className="w-full py-2 px-4 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors"
              >
                Chuyển sang Đăng nhập
              </button>
            </div>
          )}

          {/* MÀN HÌNH ĐĂNG KÝ VỚI TICK PHÂN QUYỀN & REFERRAL F0 */}
          {mode === 'register' && !registerSuccessInfo && (
            <form className="space-y-4" onSubmit={handleRegisterSubmit}>
              {/* Banner Link Giới Thiệu Đối Tác / F0 */}
              {resolvingRef && (
                <div className="p-3 rounded-lg bg-sky-50 border border-sky-200 text-sky-800 text-xs">
                  Đang kiểm tra thông tin Link Giới Thiệu...
                </div>
              )}

              {!resolvingRef && resolvedReferrer && (
                <div className="p-3.5 rounded-lg bg-sky-50 border border-sky-200 text-xs space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 font-bold text-sky-900">
                      <GitFork className="w-4 h-4 text-sky-600 shrink-0" />
                      <span>Đăng ký qua Link Giới Thiệu Đối Tác</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearReferral}
                      className="text-[11px] text-slate-500 hover:text-rose-600 underline shrink-0"
                    >
                      Xóa link
                    </button>
                  </div>
                  <p className="text-sky-800">
                    Người mời trực tiếp:{' '}
                    <strong>{resolvedReferrer.name}</strong>{' '}
                    <span className="font-mono text-[11px] bg-white px-1.5 py-0.5 rounded border border-sky-200">
                      {resolvedReferrer.code}
                    </span>{' '}
                    (Tuyến {resolvedReferrer.depth})
                  </p>
                  <p className="text-[11px] text-sky-700">
                    {resolvedReferrer.f0Id && resolvedReferrer.f0Id !== resolvedReferrer.id ? (
                      <>
                        Sẽ gắn làm <strong>Tuyến {resolvedReferrer.depth + 1}</strong> trong cây đối tác của F0{' '}
                        <strong>{resolvedReferrer.f0Name}</strong> ({resolvedReferrer.f0Code}).
                      </>
                    ) : (
                      <>
                        Sẽ gắn trực tiếp làm <strong>Tuyến 1</strong> trong cây đối tác của F0{' '}
                        <strong>{resolvedReferrer.name}</strong>.
                      </>
                    )}
                  </p>
                </div>
              )}

              {!resolvingRef && refLookupError && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>{refLookupError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearReferral}
                    className="text-[11px] underline shrink-0"
                  >
                    Bỏ mã
                  </button>
                </div>
              )}

              {/* Tick phân quyền ngay từ đầu */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">
                    Tick chọn phân quyền tài khoản ngay từ đầu <span className="text-rose-500">*</span>
                  </label>
                  {isLockedByUrlReferral && (
                    <span className="text-[10px] font-medium text-sky-700">
                      Mặc định CTV theo Link GT
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" role="radiogroup" aria-label="Chọn phân quyền tài khoản">
                  {/* Tick CTV / Đối tác */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selectedRole === 'partner'}
                    onClick={() => setSelectedRole('partner')}
                    className={`p-3 rounded-lg border text-left transition-all flex items-start gap-2.5 ${
                      selectedRole === 'partner'
                        ? 'border-sky-600 bg-sky-50/70 ring-1 ring-sky-600'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <span
                      className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors ${
                        selectedRole === 'partner'
                          ? 'bg-sky-600 border-sky-600 text-white'
                          : 'bg-white border-slate-300'
                      }`}
                    >
                      {selectedRole === 'partner' && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        <span>Cộng tác viên / Đối tác</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Gắn cây đối tác F0, nhận link giới thiệu &amp; theo dõi hoa hồng
                      </p>
                    </div>
                  </button>

                  {/* Tick Lễ tân */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selectedRole === 'frontdesk'}
                    disabled={isLockedByUrlReferral}
                    onClick={() => setSelectedRole('frontdesk')}
                    title={
                      isLockedByUrlReferral
                        ? 'Đang mở từ Link Giới Thiệu đối tác — bấm "Xóa link" ở trên nếu muốn đăng ký Lễ tân'
                        : 'Chọn vai trò Lễ tân'
                    }
                    className={`p-3 rounded-lg border text-left transition-all flex items-start gap-2.5 ${
                      isLockedByUrlReferral
                        ? 'border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed'
                        : selectedRole === 'frontdesk'
                          ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <span
                      className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors ${
                        selectedRole === 'frontdesk' && !isLockedByUrlReferral
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'bg-white border-slate-300'
                      }`}
                    >
                      {selectedRole === 'frontdesk' && !isLockedByUrlReferral && (
                        <Check className="w-3 h-3 stroke-[3]" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                        <Stethoscope className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Lễ tân (Frontdesk)</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Tiếp nhận khách hàng, gắn nguồn CTV &amp; ghi nhận doanh thu
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Thông tin cơ bản */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Họ và tên <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="VD: Nguyễn Minh Anh"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none"
                    />
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số điện thoại {selectedRole === 'partner' && <span className="text-rose-500">*</span>}
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      required={selectedRole === 'partner'}
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="09xx xxx xxx"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Địa chỉ Email <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="email@domain.com"
                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mật khẩu <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Tối thiểu 6 ký tự"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nhập lại mật khẩu <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu"
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-md text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>

              {/* Nhập mã giới thiệu thủ công nếu chọn CTV mà chưa có link ?ref= */}
              {selectedRole === 'partner' && !isLockedByUrlReferral && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Mã giới thiệu của Cấp trên / F0 (tùy chọn)
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={manualRefInput}
                        onChange={e => {
                          setManualRefInput(e.target.value.toUpperCase());
                          if (resolvedReferrer) setResolvedReferrer(null);
                          if (refLookupError) setRefLookupError('');
                        }}
                        onBlur={() => manualRefInput.trim() && handleLookupManualRef(manualRefInput)}
                        placeholder="VD: REF-A-FOUNDER (để trống nếu là F0 gốc)"
                        className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-md font-mono text-xs uppercase bg-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
                      />
                      <Link2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLookupManualRef(manualRefInput)}
                      disabled={resolvingRef || !manualRefInput.trim()}
                      className="px-3 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 rounded-md disabled:opacity-50 transition-colors shrink-0"
                    >
                      Kiểm tra mã
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || resolvingRef}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-md shadow-xs text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-60 focus:outline-none transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>
                  {loading
                    ? 'Đang khởi tạo tài khoản...'
                    : selectedRole === 'frontdesk'
                      ? 'Tạo tài khoản Lễ tân'
                      : resolvedReferrer
                        ? `Tạo CTV & Gắn vào cây ${resolvedReferrer.f0Name || resolvedReferrer.name}`
                        : 'Tạo tài khoản Cộng tác viên'}
                </span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

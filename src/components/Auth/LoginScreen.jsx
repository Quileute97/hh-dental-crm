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
  sanitizeSelfSignupRole
} from '../../utils/referral';

export default function LoginScreen({ onLoginSuccess, isModal = false, onClose }) {
  const { login, refreshProfile } = useAuth();

  // Nếu vào từ link trang chủ không có ?ref=, xóa ref cũ (nếu còn sót) để mặc định làm Đối tác gốc F0
  const urlRef = getReferralCodeFromUrl();
  const initialSilentRef = urlRef || '';

  const [mode, setMode] = useState(initialSilentRef ? 'register' : 'login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  // Tick phân quyền ngay từ đầu cho đăng ký mới ('partner' | 'frontdesk')
  const [selectedRole, setSelectedRole] = useState('partner');

  // Lưu mã ref âm thầm phía nền — không hiển thị thông tin đối tác mời trên giao diện
  const [silentRefCode, setSilentRefCode] = useState(initialSilentRef);
  const [silentParentPartner, setSilentParentPartner] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registerSuccessInfo, setRegisterSuccessInfo] = useState(null);

  // Âm thầm đọc và tra cứu mã ?ref=... (nếu có) để gắn vào cây đối tác F0 tương ứng mà không hiển thị UI mời
  useEffect(() => {
    let cancelled = false;
    async function syncSilentReferral() {
      const currentUrlRef = getReferralCodeFromUrl();
      if (!currentUrlRef) {
        if (getSavedReferralCode()) {
          clearSavedReferralCode();
        }
        setSilentRefCode('');
        setSilentParentPartner(null);
        return;
      }

      saveReferralCode(currentUrlRef);
      setSilentRefCode(currentUrlRef);
      setMode('register');
      setSelectedRole('partner');

      const info = await apiResolveReferralCode(currentUrlRef);
      if (!cancelled) {
        setSilentParentPartner(info || null);
      }
    }

    syncSilentReferral();
    return () => {
      cancelled = true;
    };
  }, []);

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

    const safeRole = sanitizeSelfSignupRole(selectedRole);

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

    // Nếu đăng ký qua link ?ref= và chọn CTV -> âm thầm gắn tuyến dưới đối tác mời;
    // Nếu mở từ trang chủ không có ?ref= -> parentPartnerId = null (Đối tác gốc F0)
    const activeRefCode = safeRole === 'partner' ? silentRefCode : '';
    const activeParentId = safeRole === 'partner' ? (silentParentPartner?.id || null) : null;

    setLoading(true);
    const res = await apiCreateAccountWithRole({
      email,
      password,
      fullName,
      phone,
      role: safeRole,
      parentPartnerId: activeParentId,
      referrerCode: activeRefCode,
      useEphemeralClient: false
    });
    setLoading(false);

    if (!res.ok) {
      setError(res.error || 'Không thể đăng ký tài khoản. Vui lòng thử lại.');
      return;
    }

    clearSavedReferralCode();
    stripReferralFromUrl();

    if (res.requiresEmailConfirmation) {
      setRegisterSuccessInfo({
        email: email.trim().toLowerCase(),
        role: safeRole
      });
      return;
    }

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
              className={`flex items-center justify-center gap-1.5 py-2 rounded-md transition-colors ${mode === 'login'
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
              className={`flex items-center justify-center gap-1.5 py-2 rounded-md transition-colors ${mode === 'register'
                  ? 'bg-white text-sky-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Đăng ký tài khoản</span>
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
                    .
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

          {/* MÀN HÌNH ĐĂNG KÝ VỚI TICK PHÂN QUYỀN (GIAO DIỆN ĐỒNG NHẤT, KHÔNG HIỂN THỊ NGƯỜI MỜI / Ô MÃ GT) */}
          {mode === 'register' && !registerSuccessInfo && (
            <form className="space-y-4" onSubmit={handleRegisterSubmit}>
              {/* Tick phân quyền ngay từ đầu */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Tick chọn phân quyền tài khoản ngay từ đầu <span className="text-rose-500">*</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" role="radiogroup" aria-label="Chọn phân quyền tài khoản">
                  {/* Tick CTV / Đối tác */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selectedRole === 'partner'}
                    onClick={() => setSelectedRole('partner')}
                    className={`p-3 rounded-lg border text-left transition-all flex items-start gap-2.5 ${selectedRole === 'partner'
                        ? 'border-sky-600 bg-sky-50/70 ring-1 ring-sky-600'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                  >
                    <span
                      className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors ${selectedRole === 'partner'
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
                        Theo dõi sổ khách hàng &amp; hoa hồng giới thiệu
                      </p>
                    </div>
                  </button>

                  {/* Tick Lễ tân */}
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selectedRole === 'frontdesk'}
                    onClick={() => setSelectedRole('frontdesk')}
                    className={`p-3 rounded-lg border text-left transition-all flex items-start gap-2.5 ${selectedRole === 'frontdesk'
                        ? 'border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                  >
                    <span
                      className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors ${selectedRole === 'frontdesk'
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'bg-white border-slate-300'
                        }`}
                    >
                      {selectedRole === 'frontdesk' && <Check className="w-3 h-3 stroke-[3]" />}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
                        <Stethoscope className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Lễ tân (Frontdesk)</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Tiếp nhận khách hàng &amp; ghi nhận doanh thu khám
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

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-md shadow-xs text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-60 focus:outline-none transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>
                  {loading
                    ? 'Đang khởi tạo tài khoản...'
                    : selectedRole === 'frontdesk'
                      ? 'Tạo tài khoản Lễ tân'
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

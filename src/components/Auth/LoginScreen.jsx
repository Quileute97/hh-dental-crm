import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Lock, Mail, ArrowRight, X, Calculator, Stethoscope, Users } from 'lucide-react';

export default function LoginScreen({ onLoginSuccess, isModal = false, onClose }) {
  const { login, demoLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
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

  function handleDemoAccess(role, partnerId = null) {
    demoLogin(role, partnerId);
    if (onLoginSuccess) onLoginSuccess();
  }

  const containerClass = isModal
    ? "relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 sm:p-8"
    : "min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8";

  return (
    <div className={containerClass}>
      {isModal && onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      <div className={isModal ? "text-center mb-6" : "sm:mx-auto sm:w-full sm:max-w-md text-center"}>
        <img
          src="/logo.png"
          alt="HH Dental Clinic"
          className="mx-auto h-12 w-auto object-contain mix-blend-multiply"
        />
        <h2 className="mt-2 text-center text-lg font-bold tracking-tight text-slate-900">
          Đăng Nhập / Phân Quyền Vai Trò
        </h2>
        <p className="mt-0.5 text-center text-xs text-slate-500">
          HH Dental Clinic &bull; Supabase Auth & RLS
        </p>
      </div>

      <div className={isModal ? "" : "mt-6 sm:mx-auto sm:w-full sm:max-w-md"}>
        <div className={isModal ? "space-y-5" : "bg-white py-8 px-6 shadow-sm border border-slate-200 sm:rounded-xl sm:px-10 space-y-6"}>
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
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
              className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-xs text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 focus:outline-none transition-colors"
            >
              <span>{loading ? 'Đang xác thực...' : 'Đăng nhập hệ thống'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Quick Demo Access - Phân Quyền Thử Nghiệm */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">
              Truy cập nhanh theo vai trò (Demo RLS)
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => handleDemoAccess('admin')}
                className="p-2 rounded border border-slate-200 bg-slate-50 hover:bg-sky-50 hover:border-sky-300 text-left transition-all flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-sky-600 shrink-0" />
                <div>
                  <div className="font-bold text-slate-900">Admin</div>
                  <div className="text-[10px] text-slate-500">Toàn quyền hệ thống</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoAccess('accountant')}
                className="p-2 rounded border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 text-left transition-all flex items-center gap-2"
              >
                <Calculator className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-bold text-slate-900">Kế Toán</div>
                  <div className="text-[10px] text-slate-500">Đối soát & Chốt sổ</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoAccess('frontdesk')}
                className="p-2 rounded border border-slate-200 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 text-left transition-all flex items-center gap-2"
              >
                <Stethoscope className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <div className="font-bold text-slate-900">Lễ Tân</div>
                  <div className="text-[10px] text-slate-500">Tiếp nhận khách hàng</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDemoAccess('partner', 'P1')}
                className="p-2 rounded border border-slate-200 bg-slate-50 hover:bg-purple-50 hover:border-purple-300 text-left transition-all flex items-center gap-2"
              >
                <Users className="w-4 h-4 text-purple-600 shrink-0" />
                <div>
                  <div className="font-bold text-slate-900">Đối Tác (P1)</div>
                  <div className="text-[10px] text-slate-500">Chỉ xem cây nhánh</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

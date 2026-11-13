import React, { useEffect } from 'react';
import { 
  LayoutDashboard, 
  Network, 
  Users, 
  Coins, 
  FileSpreadsheet, 
  RotateCcw,
  Sparkles,
  ClipboardList,
  GitFork,
  LogOut,
  ShieldCheck,
  UserCheck,
  UserCog,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { can } from '../config/permissions';
import { COMMISSION_POLICY } from '../services/commissionEngine';

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  settlementStatus, 
  onOpenAuditLogs,
  onOpenLogin,
  mobileMenuOpen = false,
  onCloseMobileMenu = () => {}
}) {
  const { user, profile, role, logout } = useAuth();

  // Đóng sidebar khi nhấn phím Escape trên mobile
  useEffect(() => {
    if (!mobileMenuOpen) return;
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onCloseMobileMenu();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen, onCloseMobileMenu]);

  const allMenuItems = [
    {
      id: 'dashboard',
      label: 'Tổng quan điều hành',
      icon: LayoutDashboard,
      badge: null,
      visible: true,
    },
    {
      id: 'partners',
      label: 'Cây đối tác & Phí nhánh',
      icon: Network,
      badge: 'Phí 1%',
      badgeColor: 'sky',
      visible: can(role, 'viewOtherPartners'),
    },
    {
      id: 'customers',
      label: 'Chuỗi khách hàng',
      icon: Users,
      badge: 'Độ sâu',
      badgeColor: 'emerald',
      visible: true,
    },
    {
      id: 'commissions',
      label: 'Quyết toán & Chốt sổ',
      icon: Coins,
      badge: settlementStatus?.isFullySettled ? 'Đã chốt' : 'Cần chốt',
      badgeColor: settlementStatus?.isFullySettled ? 'emerald' : 'amber',
      visible: can(role, 'settleMonth'),
    },
    {
      id: 'reports',
      label: 'Báo cáo & Xuất Excel',
      icon: FileSpreadsheet,
      badge: 'BOM UTF-8',
      badgeColor: 'slate',
      visible: can(role, 'viewSystemRevenue'),
    },
    {
      id: 'accounts',
      label: 'Tài khoản & Phân quyền',
      icon: UserCog,
      badge: 'Admin',
      badgeColor: 'purple',
      visible: can(role, 'manageAccounts'),
    },
  ];

  // Lọc Menu theo Ma trận Phân quyền can(role, ...)
  const visibleMenuItems = allMenuItems.filter(item => item.visible);

  const roleLabels = {
    admin: { label: 'Quản Trị Viên', color: 'bg-purple-100 text-purple-800 border-purple-300' },
    accountant: { label: 'Kế Toán Trưởng', color: 'bg-blue-100 text-blue-800 border-blue-300' },
    frontdesk: { label: 'Lễ Tân Tiếp Đón', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    partner: { label: 'Đối Tác CTV', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  };

  const currentRoleInfo = roleLabels[role] || roleLabels.admin;

  return (
    <>
      {/* Backdrop overlay mờ cho mobile / tablet */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden transition-opacity"
          onClick={onCloseMobileMenu}
          aria-hidden="true"
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white border-r border-slate-200 flex flex-col shrink-0 h-full transition-transform duration-200 ease-in-out lg:static lg:w-64 lg:h-screen lg:translate-x-0 ${
        mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* Brand logo & mobile close button */}
        <div className="h-16 px-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <img 
              src="/logo.png" 
              alt="HH Dental Clinic Logo" 
              className="h-11 w-auto object-contain mix-blend-multiply"
            />
            <div className="border-l border-slate-200 pl-2.5">
              <p className="text-[10px] text-sky-600 font-bold uppercase tracking-wider">Hệ Thống</p>
              <p className="text-[11px] text-slate-700 font-semibold leading-tight">Quản Trị CRM</p>
            </div>
          </div>

          {/* Nút đóng Sidebar trên mobile */}
          <button
            type="button"
            onClick={onCloseMobileMenu}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Đóng menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation menu */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 flex items-center justify-between">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Phân Hệ Quản Trị
            </p>
            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${currentRoleInfo.color}`}>
              {currentRoleInfo.label}
            </span>
          </div>

          {visibleMenuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  onCloseMobileMenu();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors text-left ${
                  isActive
                    ? 'bg-sky-50 text-sky-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-sky-600' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                    item.badgeColor === 'amber'
                      ? 'bg-amber-100 text-amber-800'
                      : item.badgeColor === 'emerald'
                      ? 'bg-emerald-100 text-emerald-800'
                      : item.badgeColor === 'sky'
                      ? 'bg-sky-100 text-sky-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {can(role, 'viewAudit') && (
            <div className="pt-2">
              <button
                onClick={() => {
                  onOpenAuditLogs();
                  onCloseMobileMenu();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                <ClipboardList className="w-4 h-4 text-slate-500" />
                <span>Sổ kiểm toán (Audit Log)</span>
              </button>
            </div>
          )}
        </nav>

      {/* Policy card: Plan V5 Two Independent Systems */}
      <div className="p-3 mx-3 my-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
        <div className="font-semibold text-slate-900 flex items-center justify-between mb-1.5">
          <span className="flex items-center gap-1">
            <GitFork className="w-3.5 h-3.5 text-sky-600" />
            <span>Chính sách Plan V5</span>
          </span>
          <span className="text-[10px] text-sky-700 bg-white px-1.5 py-0.5 rounded border border-sky-300 font-bold">Postgres RPC</span>
        </div>
        
        {/* Hệ thống 1: Chuỗi khách */}
        <div className="space-y-1 text-[11px] text-slate-600 border-b border-slate-200 pb-2 mb-2">
          <div className="font-semibold text-slate-800 text-[10px] uppercase">1. Chuỗi khách (Độ sâu)</div>
          <div className="flex justify-between">
            <span>Tầng 1 (Trực tiếp):</span>
            <span className="font-bold text-sky-700">CTV {COMMISSION_POLICY.depth1}%</span>
          </div>
          <div className="flex justify-between">
            <span>Tầng 2+ (Hạ tầng):</span>
            <span className="font-bold text-sky-700">CTV {COMMISSION_POLICY.depth2}%</span>
          </div>
          <div className="flex justify-between">
            <span>Tầng 3 đến tầng n:</span>
            <span className="font-bold text-sky-700">CTV {COMMISSION_POLICY.depth3Plus}%</span>
          </div>
        </div>

        {/* Hệ thống 2: Cây đối tác */}
        <div className="space-y-1 text-[11px] text-slate-600">
          <div className="font-semibold text-slate-800 text-[10px] uppercase">2. Cây đối tác (Không giới hạn)</div>
          <div className="flex justify-between font-semibold text-emerald-800">
            <span>Phí nhánh cấp trên:</span>
            <span className="bg-emerald-100 text-emerald-800 px-1 rounded font-bold">1% nhánh</span>
          </div>
        </div>
      </div>

      {/* User profile & Switcher / Logout */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-sky-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
              {(profile?.full_name || role)?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-slate-800 text-xs truncate">
                {profile?.full_name || (user ? user.email : 'Quản Trị Viên')}
              </div>
              <div className="text-[10px] text-slate-500 truncate">
                Role: <strong>{role}</strong>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onOpenLogin && onOpenLogin()}
              className="p-1 rounded text-slate-400 hover:text-sky-600 hover:bg-slate-100 transition-colors"
              title="Chuyển đổi tài khoản / Role"
            >
              <UserCheck className="w-4 h-4" />
            </button>
            <button
              onClick={logout}
              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100 transition-colors"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
}

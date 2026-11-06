import React from 'react';
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
  CheckCircle2
} from 'lucide-react';

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  settlementStatus, 
  onResetData,
  onOpenAuditLogs
}) {
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Tổng quan điều hành',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'partners',
      label: 'Cây đối tác & Phí nhánh',
      icon: Network,
      badge: 'Phí 1%',
      badgeColor: 'sky',
    },
    {
      id: 'customers',
      label: 'Chuỗi khách hàng',
      icon: Users,
      badge: 'Độ sâu',
      badgeColor: 'emerald',
    },
    {
      id: 'commissions',
      label: 'Quyết toán & Chốt sổ',
      icon: Coins,
      badge: settlementStatus?.isFullySettled ? 'Đã chốt' : 'Cần chốt',
      badgeColor: settlementStatus?.isFullySettled ? 'emerald' : 'amber',
    },
    {
      id: 'reports',
      label: 'Báo cáo & Xuất Excel',
      icon: FileSpreadsheet,
      badge: 'BOM UTF-8',
      badgeColor: 'slate',
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-screen">
      {/* Brand logo */}
      <div className="h-16 px-4 border-b border-slate-200 flex items-center justify-between bg-white">
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
      </div>

      {/* Navigation menu */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="px-3 pb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          Phân Hệ Quản Trị
        </p>
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
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

        <div className="pt-2">
          <button
            onClick={onOpenAuditLogs}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <ClipboardList className="w-4 h-4 text-slate-500" />
            <span>Sổ kiểm toán (Audit Log)</span>
          </button>
        </div>
      </nav>

      {/* Policy card: Plan V5 Two Independent Systems */}
      <div className="p-3 mx-3 my-2 rounded-lg bg-slate-50 border border-slate-200 text-xs">
        <div className="font-semibold text-slate-900 flex items-center justify-between mb-1.5">
          <span className="flex items-center gap-1">
            <GitFork className="w-3.5 h-3.5 text-sky-600" />
            <span>Chính sách Plan V5</span>
          </span>
          <span className="text-[10px] text-sky-700 bg-white px-1.5 py-0.5 rounded border border-sky-300 font-bold">2 Hệ thống</span>
        </div>
        
        {/* Hệ thống 1: Chuỗi khách */}
        <div className="space-y-1 text-[11px] text-slate-600 border-b border-slate-200 pb-2 mb-2">
          <div className="font-semibold text-slate-800 text-[10px] uppercase">1. Chuỗi khách (Theo độ sâu)</div>
          <div className="text-[10px] text-emerald-700 font-medium">Sàn không thu &bull; Hoàn toàn bộ về CTV:</div>
          <div className="flex justify-between">
            <span>Độ sâu 1 (Trực tiếp):</span>
            <span className="font-bold text-sky-700">CTV 20%</span>
          </div>
          <div className="flex justify-between">
            <span>Độ sâu 2:</span>
            <span className="font-bold text-sky-700">CTV 10%</span>
          </div>
          <div className="flex justify-between">
            <span>Độ sâu 3+:</span>
            <span className="font-bold text-sky-700">CTV 5%</span>
          </div>
        </div>

        {/* Hệ thống 2: Cây đối tác */}
        <div className="space-y-1 text-[11px] text-slate-600">
          <div className="font-semibold text-slate-800 text-[10px] uppercase">2. Cây đối tác (Không giới hạn)</div>
          <div className="flex justify-between font-semibold text-emerald-800">
            <span>Phí nhánh cấp trên:</span>
            <span className="bg-emerald-100 text-emerald-800 px-1 rounded font-bold">1% nhánh</span>
          </div>
          <div className="text-[10px] text-slate-500 italic">
            Áp dụng trên toàn bộ doanh thu cây con trực tiếp
          </div>
        </div>
      </div>

      {/* Reset seed data button */}
      <div className="p-3 border-t border-slate-200">
        <button
          onClick={onResetData}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors border border-slate-200"
          title="Khôi phục lại dữ liệu mẫu chuẩn Plan V5 (172.000.000 VNĐ)"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
          <span>Đặt lại dữ liệu mẫu V5</span>
        </button>
      </div>
    </aside>
  );
}

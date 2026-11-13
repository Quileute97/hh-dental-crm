import React from 'react';
import { Plus, Calendar, Users, PackagePlus, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { can } from '../config/permissions';

export default function Header({
  selectedMonth,
  onMonthChange,
  onOpenNewCustomer,
  onOpenNewPartner,
  onOpenServicePackages,
  onToggleMobileMenu = () => {}
}) {
  const { role } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-4 md:px-6 flex items-center justify-between shrink-0 gap-2">
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Nút Hamburger menu mở Sidebar trên Mobile & Tablet */}
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="lg:hidden p-1.5 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
          title="Mở menu điều hướng"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <img
            src="/logo.png"
            alt="HH Dental Clinic Logo"
            className="h-8 w-auto object-contain mix-blend-multiply"
          />
          <span className="font-bold text-slate-800 text-sm tracking-tight hidden md:inline">
            HH Dental Clinic
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* Bộ chọn KỲ (input type="month") */}
        <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 border border-slate-300 rounded-md px-2 sm:px-2.5 py-1 text-xs">
          <Calendar className="w-3.5 h-3.5 text-sky-600 shrink-0" />
          <span className="font-semibold text-slate-700 hidden sm:inline">Kỳ đối soát:</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            className="bg-white border border-slate-300 rounded px-1.5 sm:px-2 py-0.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 max-w-[125px] sm:max-w-none"
          />
        </div>

        {/* Nút Thêm Gói dịch vụ - Chỉ Admin (can: manageServices) */}
        {can(role, 'manageServices') && (
          <button
            type="button"
            onClick={onOpenServicePackages}
            className="inline-flex items-center justify-center gap-1.5 p-1.5 sm:px-3 sm:py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 rounded-md transition-colors shadow-2xs shrink-0"
            title="Quản lý và thêm gói dịch vụ điều trị nha khoa"
          >
            <PackagePlus className="w-3.5 h-3.5 text-sky-600" />
            <span className="hidden sm:inline">Gói dịch vụ</span>
          </button>
        )}

        {/* Nút Thêm đối tác - Chỉ Admin (can: managePartners) */}
        {can(role, 'managePartners') && (
          <button
            type="button"
            onClick={onOpenNewPartner}
            className="inline-flex items-center justify-center gap-1.5 p-1.5 sm:px-3 sm:py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors shrink-0"
            title="Thêm đối tác mới vào cây phả hệ"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Thêm đối tác</span>
          </button>
        )}

        {/* Nút Khách hàng mới - Admin & Frontdesk (can: manageCustomers) */}
        {can(role, 'manageCustomers') && (
          <button
            type="button"
            onClick={onOpenNewCustomer}
            className="inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-md transition-colors shadow-sm shrink-0"
            title="Tiếp nhận khách hàng mới"
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">+ Khách hàng mới</span>
            <span className="sm:hidden">+ Khách</span>
          </button>
        )}
      </div>
    </header>
  );
}

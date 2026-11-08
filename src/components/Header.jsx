import React from 'react';
import { Plus, Calendar, Users, PackagePlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { can } from '../config/permissions';

export default function Header({
  selectedMonth,
  onMonthChange,
  onOpenNewCustomer,
  onOpenNewPartner,
  onOpenServicePackages
}) {
  const { role } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="HH Dental Clinic Logo"
            className="h-8 w-auto object-contain mix-blend-multiply"
          />
          <span className="font-bold text-slate-800 text-sm tracking-tight hidden sm:inline">
            HH Dental Clinic
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Bộ chọn KỲ (input type="month") */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1 text-xs">
          <Calendar className="w-3.5 h-3.5 text-sky-600" />
          <span className="font-semibold text-slate-700">Kỳ đối soát:</span>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => onMonthChange(e.target.value)}
            className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        {/* Nút Thêm Gói dịch vụ - Chỉ Admin (can: manageServices) */}
        {can(role, 'manageServices') && (
          <button
            onClick={onOpenServicePackages}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 border border-sky-200 hover:bg-sky-100 rounded-md transition-colors shadow-2xs"
            title="Quản lý và thêm gói dịch vụ điều trị nha khoa"
          >
            <PackagePlus className="w-3.5 h-3.5 text-sky-600" />
            <span>Thêm Gói dịch vụ</span>
          </button>
        )}

        {/* Nút Thêm đối tác - Chỉ Admin (can: managePartners) */}
        {can(role, 'managePartners') && (
          <button
            onClick={onOpenNewPartner}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            <span>Thêm đối tác</span>
          </button>
        )}

        {/* Nút Khách hàng mới - Admin & Frontdesk (can: manageCustomers) */}
        {can(role, 'manageCustomers') && (
          <button
            onClick={onOpenNewCustomer}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-md transition-colors shadow-sm"
          >
            <Users className="w-3.5 h-3.5" />
            <span>+ Khách hàng mới</span>
          </button>
        )}
      </div>
    </header>
  );
}

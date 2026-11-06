import React from 'react';
import { FileSpreadsheet, Download, Filter, Calendar, Users, CheckCircle2, ShieldCheck, DollarSign, GitFork } from 'lucide-react';
import { exportSettlementToCSV, exportCustomersToCSV } from '../../services/exportService';
import { formatVND } from '../../utils/formatters';

export default function ReportsView({ 
  month, 
  customers, 
  visits, 
  partners, 
  settlementResult 
}) {
  const {
    periodRevenue = 0,
    totalCtvCommission = 0,
    totalPlatformShare = 0,
    totalBranchFee = 0,
    totalCost = 0,
    costPercent = 0,
    partnerRows = []
  } = settlementResult || {};

  function handleExportSettlement() {
    exportSettlementToCSV(partnerRows, month);
  }

  function handleExportCustomers() {
    exportCustomersToCSV(customers, visits, partners);
  }

  return (
    <div className="space-y-5">
      {/* 2 Thẻ tải file báo cáo chuẩn UTF-8 BOM */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Bảng đối soát chốt sổ kế toán tháng */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center gap-2.5 text-sky-700">
              <FileSpreadsheet className="w-5 h-5" />
              <h3 className="font-bold text-sm text-slate-900">
                Bảng Kê Đối Soát Quyết Toán Tháng (Kỳ {month})
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Trích xuất tệp CSV/Excel chuẩn đối soát 8 cột bắt buộc: <strong>Đối tác, Tên, Cấp trên, Sổ khách, Doanh thu nhánh, Hoa hồng, Phí nhánh 1%, Tổng phải trả</strong>. Kèm thông tin tài khoản ngân hàng.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Chuẩn BOM UTF-8 không lỗi font tiếng Việt</span>
            <button
              onClick={handleExportSettlement}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-md transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải bảng đối soát ({month})</span>
            </button>
          </div>
        </div>

        {/* Card 2: Báo cáo chuỗi khách hàng & Doanh thu trọn đời */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between shadow-xs">
          <div>
            <div className="flex items-center gap-2.5 text-emerald-700">
              <Users className="w-5 h-5" />
              <h3 className="font-bold text-sm text-slate-900">
                Báo Cáo Chuỗi Khách Hàng & Doanh Thu Trọn Đời
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Xuất toàn bộ cây khách hàng đa độ sâu: <strong>Mã KH, Tên, CTV sở hữu, Khách giới thiệu, Độ sâu (Depth), Dịch vụ điều trị, Doanh thu cộng dồn qua các lần tái khám</strong>.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">{customers.length} khách hàng trong chuỗi</span>
            <button
              onClick={handleExportCustomers}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải danh sách chuỗi khách</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tóm tắt chỉ tiêu tài chính kỳ đối soát */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-xs">
        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <GitFork className="w-4 h-4 text-sky-600" />
          <span>Tổng Kết Tài Chính Kỳ Đối Soát {month}</span>
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <span className="text-[11px] text-slate-500 block">Doanh thu kỳ</span>
            <span className="text-lg font-bold text-slate-900">{formatVND(periodRevenue)}</span>
          </div>

          <div className="bg-emerald-50/60 p-3.5 rounded-lg border border-emerald-200">
            <span className="text-[11px] text-emerald-700 block">Hoa hồng CTV</span>
            <span className="text-lg font-bold text-emerald-800">{formatVND(totalCtvCommission)}</span>
          </div>

          <div className="bg-indigo-50/60 p-3.5 rounded-lg border border-indigo-200">
            <span className="text-[11px] text-indigo-700 block">Phần Nền tảng</span>
            <span className="text-lg font-bold text-indigo-800">{formatVND(totalPlatformShare)}</span>
          </div>

          <div className="bg-amber-50/60 p-3.5 rounded-lg border border-amber-200">
            <span className="text-[11px] text-amber-700 block">Phí nhánh 1%</span>
            <span className="text-lg font-bold text-amber-800">{formatVND(totalBranchFee)}</span>
          </div>
        </div>

        <div className="p-4 bg-slate-900 text-white rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Tổng chi phí toàn bộ / Doanh thu</span>
            <span className="text-base font-bold text-white">
              {formatVND(totalCost)} ({costPercent.toFixed(1)}% doanh thu)
            </span>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block text-[11px]">Nha khoa giữ lại thực tế</span>
            <span className="text-base font-bold text-emerald-400">
              {formatVND(Math.max(0, periodRevenue - totalCost))} ({periodRevenue > 0 ? (100 - costPercent).toFixed(1) : 0}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

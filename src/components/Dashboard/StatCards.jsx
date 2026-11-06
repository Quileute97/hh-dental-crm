import React from 'react';
import { DollarSign, Percent, TrendingUp, GitFork, Award, CheckCircle2 } from 'lucide-react';
import { formatVND } from '../../utils/formatters';

export default function StatCards({ settlementResult }) {
  const {
    periodRevenue = 0,
    totalCtvCommission = 0,
    totalPlatformShare = 0,
    totalBranchFee = 0,
    totalCost = 0,
    costPercent = 0,
    month = ''
  } = settlementResult || {};

  return (
    <div className="space-y-4">
      {/* 4 Chỉ số chính theo yêu cầu 3.2 Plan v5 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Chỉ số 1: Doanh thu kỳ */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Doanh thu kỳ</span>
            <div className="w-8 h-8 rounded-md bg-sky-50 text-sky-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">{formatVND(periodRevenue)}</div>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Kỳ đối soát: <strong>{month}</strong></span>
              <span className="text-sky-600 font-medium">Toàn hệ thống</span>
            </p>
          </div>
        </div>

        {/* Chỉ số 2: Hoa hồng CTV */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hoa hồng CTV</span>
            <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-700">{formatVND(totalCtvCommission)}</div>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">
              {periodRevenue > 0 ? `${((totalCtvCommission / periodRevenue) * 100).toFixed(1)}%` : '0%'} trên doanh thu
            </p>
          </div>
        </div>

        {/* Chỉ số 3: Phần nền tảng */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Phần nền tảng (Sàn)</span>
            <div className="w-8 h-8 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-indigo-700">{formatVND(totalPlatformShare)}</div>
            <p className="text-[11px] text-indigo-600 font-medium mt-1">
              Sàn không thu (0%) &bull; Hoàn toàn bộ về CTV
            </p>
          </div>
        </div>

        {/* Chỉ số 4: Phí nhánh 1% */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Phí nhánh 1%</span>
            <div className="w-8 h-8 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
              <GitFork className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-700">{formatVND(totalBranchFee)}</div>
            <p className="text-[11px] text-slate-500 mt-1">
              Phân bổ cấp trên trên toàn nhánh con
            </p>
          </div>
        </div>
      </div>

      {/* Dải tổng kết hiệu suất: Tổng chi phí / Doanh thu (%) */}
      <div className="bg-slate-900 text-white rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-white/10 flex items-center justify-center text-sky-400">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-300 font-medium">Tỷ lệ Tổng Chi Phí / Doanh Thu Kỳ {month}</div>
            <div className="text-xl font-bold text-white flex items-center gap-2 mt-0.5">
              <span>{costPercent.toFixed(1)}%</span>
              <span className="text-xs font-normal text-slate-400">
                (Tổng chi: {formatVND(totalCost)} / Doanh thu: {formatVND(periodRevenue)})
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="text-right">
            <span className="text-slate-400 block text-[10px]">Lợi nhuận giữ lại Nha khoa</span>
            <span className="text-emerald-400 font-bold text-sm">
              {formatVND(Math.max(0, periodRevenue - totalCost))} ({periodRevenue > 0 ? (100 - costPercent).toFixed(1) : 0}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

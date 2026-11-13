import React, { useMemo } from 'react';
import { 
  DollarSign, 
  Percent, 
  TrendingUp, 
  GitFork, 
  Award, 
  Users, 
  CalendarCheck, 
  AlertCircle, 
  Gift 
} from 'lucide-react';
import { formatVND } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../config/permissions';

export default function StatCards({ 
  settlementResult = {}, 
  customers = [], 
  visits = [] 
}) {
  const { role, isPartner, isFrontdesk } = useAuth();
  const {
    periodRevenue = 0,
    totalCtvCommission = 0,
    totalPlatformShare = 0,
    totalBranchFee = 0,
    totalCost = 0,
    costPercent = 0,
    month = '',
    summary = {}
  } = settlementResult || {};

  // Tính toán các chỉ số vận hành lâm sàng & công nợ
  const { todayCustomers, todayVisits, debtAmount, totalCredits } = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);

    let custCount = 0;
    (customers || []).forEach(c => {
      if (c.createdAt && c.createdAt.slice(0, 10) === todayStr) {
        custCount++;
      }
    });

    let visitCount = 0;
    let debt = 0;
    (visits || []).forEach(v => {
      if (v.occurredAt && v.occurredAt.slice(0, 10) === todayStr) {
        visitCount++;
      }
      const st = (v.paymentStatus || '').toLowerCase();
      const note = (v.note || '').toLowerCase();
      if (st === 'pending' || st === 'partial' || note.includes('chưa thanh toán') || note.includes('ghi nợ') || note.includes('thanh toán một phần')) {
        debt += Number(v.amount || 0);
      }
    });

    return {
      todayCustomers: custCount,
      todayVisits: visitCount,
      debtAmount: debt,
      totalCredits: summary.totalCredit || 0
    };
  }, [customers, visits, summary]);

  // --------------------------------------------------------------------------
  // 1. GIAO DIỆN LỄ TÂN (FRONTDESK): CHỈ HIỂN THỊ KPI VẬN HÀNH & CÔNG NỢ
  // Ẩn hoàn toàn doanh thu hệ thống, hoa hồng CTV và lợi nhuận giữ lại
  // --------------------------------------------------------------------------
  if (isFrontdesk) {
    return (
      <div className="space-y-3 sm:space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* KPI 1: Khách mới hôm nay */}
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 sm:p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">Khách mới hôm nay</span>
              <div className="w-8 h-8 rounded-md bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5 sm:mt-3">
              <div className="text-xl sm:text-2xl font-bold text-slate-900">{todayCustomers}</div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1">Tiếp nhận tại phòng khám</p>
            </div>
          </div>

          {/* KPI 2: Lượt khám hôm nay */}
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 sm:p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">Lượt điều trị hôm nay</span>
              <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CalendarCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5 sm:mt-3">
              <div className="text-xl sm:text-2xl font-bold text-emerald-700">{todayVisits}</div>
              <p className="text-[10px] sm:text-[11px] text-emerald-600 font-medium mt-1">Lượt khám & thủ thuật</p>
            </div>
          </div>

          {/* KPI 3: Công nợ khách hàng (Pending + Partial) */}
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 sm:p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">Công nợ (Chưa thu)</span>
              <div className="w-8 h-8 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5 sm:mt-3">
              <div className="text-xl sm:text-2xl font-bold text-amber-700 truncate">{formatVND(debtAmount)}</div>
              <p className="text-[10px] sm:text-[11px] text-amber-600 font-medium mt-1">Chờ thu viện phí / Trả góp</p>
            </div>
          </div>

          {/* KPI 4: Credit giới thiệu đã phát */}
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 sm:p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">Credit đã phát</span>
              <div className="w-8 h-8 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Gift className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2.5 sm:mt-3">
              <div className="text-xl sm:text-2xl font-bold text-purple-700 truncate">{formatVND(totalCredits)}</div>
              <p className="text-[10px] sm:text-[11px] text-purple-600 font-medium mt-1">Thưởng khách giới thiệu khách</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 2. GIAO DIỆN ĐỐI TÁC (PARTNER) VÀ ADMIN / ACCOUNTANT
  // --------------------------------------------------------------------------
  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Hàng KPI chính */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Chỉ số 1: Doanh thu */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {isPartner ? 'Doanh thu của tôi' : 'Doanh thu hệ thống'}
            </span>
            <div className="w-8 h-8 rounded-md bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3">
            <div className="text-xl sm:text-2xl font-bold text-slate-900 truncate">{formatVND(periodRevenue)}</div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1 flex items-center justify-between">
              <span>Kỳ: <strong>{month}</strong></span>
              <span className="text-sky-600 font-medium">
                {isPartner ? 'Sổ khách cá nhân' : 'Toàn hệ thống'}
              </span>
            </p>
          </div>
        </div>

        {/* Chỉ số 2: Hoa hồng CTV */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {isPartner ? 'Hoa hồng CTV nhận' : 'Hoa hồng CTV'}
            </span>
            <div className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3">
            <div className="text-xl sm:text-2xl font-bold text-emerald-700 truncate">{formatVND(totalCtvCommission)}</div>
            <p className="text-[10px] sm:text-[11px] text-emerald-600 font-medium mt-1">
              {periodRevenue > 0 ? `${((totalCtvCommission / periodRevenue) * 100).toFixed(1)}%` : '0%'} trên doanh thu
            </p>
          </div>
        </div>

        {/* Chỉ số 3: Thưởng quản lý 1% */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">Thưởng QL 1%</span>
            <div className="w-8 h-8 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <GitFork className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3">
            <div className="text-xl sm:text-2xl font-bold text-amber-700 truncate">{formatVND(totalBranchFee)}</div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 mt-1">
              Thưởng doanh số cấp quản lí 1%
            </p>
          </div>
        </div>

        {/* Chỉ số 4: Công nợ (Pending + Partial) */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {isPartner ? 'Công nợ khách của tôi' : 'Công nợ toàn hệ thống'}
            </span>
            <div className="w-8 h-8 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3">
            <div className="text-xl sm:text-2xl font-bold text-purple-700 truncate">{formatVND(debtAmount)}</div>
            <p className="text-[10px] sm:text-[11px] text-purple-600 font-medium mt-1">
              {isPartner ? 'Viện phí chưa hoàn tất' : 'Chờ thu / Chưa thanh toán'}
            </p>
          </div>
        </div>
      </div>

      {/* Dải tổng kết hiệu suất: CHỈ HIỂN THỊ VỚI ADMIN & ACCOUNTANT */}
      {can(role, 'viewProfit') && (
        <div className="bg-slate-900 text-white rounded-lg p-3.5 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-white/10 flex items-center justify-center text-sky-400 shrink-0">
              <Percent className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-slate-300 font-medium">Tỷ lệ Tổng Chi Phí / Doanh Thu Kỳ {month}</div>
              <div className="text-lg sm:text-xl font-bold text-white flex flex-wrap items-baseline gap-2 mt-0.5">
                <span>{costPercent.toFixed(1)}%</span>
                <span className="text-[11px] font-normal text-slate-400">
                  (Tổng chi: {formatVND(totalCost)} / Doanh thu: {formatVND(periodRevenue)})
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 text-xs pt-2 sm:pt-0 border-t border-slate-800 sm:border-0">
            <span className="text-slate-400 text-[11px] sm:text-right block">Lợi nhuận giữ lại:</span>
            <span className="text-emerald-400 font-bold text-sm sm:text-right">
              {formatVND(Math.max(0, periodRevenue - totalCost))} ({periodRevenue > 0 ? (100 - costPercent).toFixed(1) : 0}%)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

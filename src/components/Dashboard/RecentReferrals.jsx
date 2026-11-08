import React from 'react';
import { Clock, ArrowRight, UserCheck, Shield, ExternalLink } from 'lucide-react';
import { formatVND, formatDate } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../config/permissions';

export default function RecentReferrals({ 
  settlementResult, 
  onNavigateTab, 
  onViewCustomerProfile, 
  customers = [] 
}) {
  const { role } = useAuth();
  const visitBreakdowns = settlementResult?.visitBreakdowns || [];
  const showFinancials = can(role, 'viewProfit');

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-xs">
      <div className="p-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-sky-600" />
          <h3 className="font-bold text-slate-900 text-xs sm:text-sm">
            Lượt Khám & Điều Trị Trong Kỳ ({visitBreakdowns.length})
          </h3>
        </div>
        <button
          onClick={() => onNavigateTab('customers')}
          className="text-xs text-sky-600 hover:text-sky-700 font-semibold inline-flex items-center gap-1"
        >
          <span>Xem tất cả chuỗi khách</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-4">Khách hàng / Mã</th>
              <th className="py-2.5 px-4 text-center">Độ sâu (Depth)</th>
              <th className="py-2.5 px-4">Đối tác sở hữu (CTV)</th>
              <th className="py-2.5 px-4 text-right">Doanh thu visit</th>
              {showFinancials && (
                <>
                  <th className="py-2.5 px-4 text-right">Hoa hồng CTV</th>
                  <th className="py-2.5 px-4 text-right">Phần nền tảng</th>
                </>
              )}
              <th className="py-2.5 px-4 text-right">Thời gian</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visitBreakdowns.length === 0 ? (
              <tr>
                <td colSpan={showFinancials ? 7 : 5} className="py-8 text-center text-slate-400">
                  Chưa có lượt khám nào phát sinh trong kỳ này.
                </td>
              </tr>
            ) : (
              visitBreakdowns.slice(0, 7).map((item) => (
                <tr key={item.visitId} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-4">
                    <div 
                      onClick={() => {
                        if (onViewCustomerProfile) {
                          const targetCust = customers.find(c => c.id === item.customerId);
                          if (targetCust) onViewCustomerProfile(targetCust);
                        }
                      }}
                      className="font-bold text-slate-900 hover:text-sky-600 cursor-pointer transition-colors"
                      title="Bấm để xem hồ sơ khách hàng"
                    >
                      {item.customerName}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">{item.customerCode || item.customerId}</div>
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                      item.customerDepth === 1 
                        ? 'bg-sky-100 text-sky-800 border border-sky-200' 
                        : item.customerDepth === 2
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-purple-100 text-purple-800 border border-purple-200'
                    }`}>
                      Tầng {item.customerDepth}
                    </span>
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="font-semibold text-slate-800">{item.ownerPartnerName}</span>
                  </td>
                  <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                    {formatVND(item.amount)}
                  </td>
                  {showFinancials && (
                    <>
                      <td className="py-2.5 px-4 text-right">
                        <span className="font-bold text-emerald-700">{formatVND(item.ctvAmount)}</span>
                        <span className="text-[10px] text-slate-400 block">({item.ctvRate}%)</span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <span className="font-bold text-slate-400">{formatVND(item.platformAmount)}</span>
                        <span className="text-[10px] text-emerald-600 font-medium block">Sàn 0% (Hoàn CTV)</span>
                      </td>
                    </>
                  )}
                  <td className="py-2.5 px-4 text-right text-slate-500 text-[11px]">
                    {formatDate(item.occurredAt)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

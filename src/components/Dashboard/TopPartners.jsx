import React from 'react';
import { Award, ArrowRight, TrendingUp } from 'lucide-react';
import { formatVND } from '../../utils/formatters';

export default function TopPartners({ settlementResult, onNavigateTab }) {
  const partnerRows = settlementResult?.partnerRows || [];

  // Sắp xếp theo tổng thực nhận (commission + branchFee)
  const sortedPartners = [...partnerRows].sort((a, b) => b.total - a.total).slice(0, 5);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-500" />
          <h3 className="font-bold text-slate-900 text-xs sm:text-sm">Top Thu Nhập Đối Tác</h3>
        </div>
        <button
          onClick={() => onNavigateTab('partners')}
          className="text-xs text-sky-600 hover:text-sky-700 font-semibold inline-flex items-center gap-1"
        >
          <span>Xem bảng</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="mt-3 space-y-3">
        {sortedPartners.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs">Chưa có dữ liệu đối tác trong kỳ.</div>
        ) : (
          sortedPartners.map((p, idx) => (
            <div key={p.partnerId} className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                  idx === 0 
                    ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                    : idx === 1 
                    ? 'bg-slate-100 text-slate-700 border border-slate-300' 
                    : 'bg-orange-50 text-orange-700'
                }`}>
                  {idx + 1}
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900">{p.partnerName}</div>
                  <div className="text-[10px] text-slate-500">
                    Sổ: {formatVND(p.ownRevenue)} &bull; Nhánh: {formatVND(p.branchRevenue)}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="font-bold text-xs text-sky-700">{formatVND(p.total)}</div>
                <div className="text-[10px] text-slate-400">
                  {p.branchFee > 0 ? `(Gồm ${formatVND(p.branchFee)} phí)` : 'Hoa hồng CTV'}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

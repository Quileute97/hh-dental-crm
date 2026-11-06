import React from 'react';
import { X, CheckCircle2, ShieldCheck, ArrowDown, Building2, User, Coins, AlertCircle } from 'lucide-react';
import { formatVND } from '../../utils/formatters';

export default function CommissionBreakdownModal({ isOpen, onClose, referral, commissions, partners }) {
  if (!isOpen || !referral) return null;

  const partnerMap = new Map(partners.map(p => [p.id, p]));
  const refCommissions = commissions.filter(c => c.referralId === referral.id);

  const totalCommission = refCommissions.reduce((sum, c) => sum + c.amount, 0);
  const clinicNet = Math.max(0, referral.revenue - totalCommission);
  const clinicPercent = referral.revenue > 0 ? Math.round((clinicNet / referral.revenue) * 100) : 65;

  // Sắp xếp các tầng từ tầng sâu nhất (Sáng lập) xuống tầng 1 (Trực tiếp)
  const sortedCommissions = [...refCommissions].sort((a, b) => (b.uplineDepth || b.tierLevel) - (a.uplineDepth || a.tierLevel));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-lg border border-slate-200 max-w-xl w-full overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Bảng Phân Bổ Hoa Hồng 5 Cấp (Commission Cascade)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Ca khám: <strong>{referral.patientName}</strong> ({referral.id})
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {/* Revenue and clinic summary */}
          <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <span className="text-[11px] text-slate-500">Doanh thu điều trị:</span>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {formatVND(referral.revenue)}
              </div>
            </div>
            <div>
              <span className="text-[11px] text-slate-500">Tổng hoa hồng phân bổ:</span>
              <div className="text-base font-bold text-amber-700 mt-0.5">
                {formatVND(totalCommission)}
              </div>
            </div>
            <div>
              <span className="text-[11px] text-emerald-600 font-medium">Nha khoa giữ lại ({clinicPercent}%):</span>
              <div className="text-base font-bold text-emerald-700 mt-0.5">
                {formatVND(clinicNet)}
              </div>
            </div>
          </div>

          {/* Cascade flowchart cards */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-slate-700">Chi tiết phân bổ hoa hồng (T1: F0 20% • T2: F1 10% • T3..5: F2..F4 5%):</h4>
              <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                Chính sách F0..F4
              </span>
            </div>

            {sortedCommissions.length === 0 ? (
              <div className="p-4 text-center text-slate-400 bg-slate-50 rounded border border-slate-200">
                Ca này chưa được tính toán hoa hồng. Hãy bấm "Tính hoa hồng" ở danh sách.
              </div>
            ) : (
              sortedCommissions.map((comm) => {
                const partner = partnerMap.get(comm.partnerId);
                const isPaid = comm.payoutStatus === 'PAID';
                const currentDepth = comm.uplineDepth || comm.tierLevel;
                const actualLevel = partner?.level || comm.partnerLevel;

                return (
                  <div
                    key={comm.id}
                    className="p-3 rounded-lg border border-slate-200 bg-white hover:border-sky-300 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-xs ${
                        currentDepth === 1
                          ? 'bg-emerald-100 text-emerald-800'
                          : actualLevel === 5
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        T{currentDepth}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{comm.partnerName}</span>
                          <span className="text-[10px] text-slate-500 font-mono">({partner?.code})</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-slate-100 text-slate-600">
                            Hồ sơ: Cấp {actualLevel} {actualLevel === 5 ? '(Sáng lập)' : ''}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                          <span className="font-medium text-slate-700">{comm.tierName}</span>
                          <span>•</span>
                          <span className="font-semibold text-sky-700">{comm.ratePercent}% doanh thu</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-bold text-slate-900">
                        {formatVND(comm.amount)}
                      </div>
                      <div className="mt-0.5">
                        <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-medium ${
                          isPaid
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {isPaid ? 'Đã chi trả' : 'Chờ thanh toán'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Level 0 Patient indicator */}
            <div className="p-2.5 rounded-lg border border-dashed border-slate-300 bg-slate-50/50 flex items-center justify-between text-slate-500">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-slate-200 flex items-center justify-center font-bold text-xs text-slate-600">
                  L0
                </div>
                <div>
                  <div className="font-medium text-slate-700">{referral.patientName} (Bệnh nhân)</div>
                  <div className="text-[11px]">Cấp 0 (Không phân bổ hoa hồng - 0%)</div>
                </div>
              </div>
              <div className="text-right font-medium text-slate-500">0 ₫</div>
            </div>
          </div>

          {/* Clinic safe guard notice */}
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg flex items-start gap-2.5 text-[11px] text-emerald-800">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <div>
              <p className="font-semibold">Tỷ lệ giữ lại thực tế của Nha khoa:</p>
              <p className="mt-0.5 text-emerald-700">
                Tổng hoa hồng đã phân bổ: <strong>{formatVND(totalCommission)}</strong> (tương đương <strong>{100 - clinicPercent}%</strong> doanh thu). Phần thực thu giữ lại cho phòng khám: <strong>{formatVND(clinicNet)}</strong> (<strong>{clinicPercent}%</strong>).
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

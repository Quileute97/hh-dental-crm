import React, { useState } from 'react';
import { Search, Coins, CheckCircle2, Clock, Filter, ArrowUpRight, CreditCard } from 'lucide-react';
import { formatVND, formatDate } from '../../utils/formatters';

export default function CommissionList({ 
  commissions, 
  referrals, 
  partners, 
  onOpenPayoutModal, 
  onViewBreakdown 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [tierFilter, setTierFilter] = useState('ALL');

  const refMap = new Map(referrals.map(r => [r.id, r]));
  const partnerMap = new Map(partners.map(p => [p.id, p]));

  const filteredCommissions = commissions.filter(c => {
    const ref = refMap.get(c.referralId);
    const matchesSearch = 
      c.partnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.referralId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ref && ref.patientName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || c.payoutStatus === statusFilter;
    const matchesTier = tierFilter === 'ALL' || String(c.tierLevel) === tierFilter;

    return matchesSearch && matchesStatus && matchesTier;
  });

  const pendingCommissions = commissions.filter(c => c.payoutStatus === 'PENDING' || c.payoutStatus === 'APPROVED');
  const totalPendingAmount = pendingCommissions.reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="space-y-4">
      {/* Top action banner */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <Coins className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Sổ Quyết Toán Hoa Hồng Đa Cấp</h3>
            <p className="text-slate-500 mt-0.5">
              Đang có <strong>{pendingCommissions.length}</strong> khoản chờ thanh toán ({formatVND(totalPendingAmount)})
            </p>
          </div>
        </div>

        {pendingCommissions.length > 0 && (
          <button
            onClick={onOpenPayoutModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors shadow-sm shrink-0"
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Thực hiện chi trả ({formatVND(totalPendingAmount)})</span>
          </button>
        )}
      </div>

      {/* Main table container */}
      <div className="bg-white border border-slate-200 rounded-lg">
        {/* Search & filters */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm đối tác, mã ca, bệnh nhân..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING">Chờ chi trả</option>
              <option value="PAID">Đã thanh toán</option>
            </select>

            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-md py-1.5 px-2.5 focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
            >
              <option value="ALL">Tất cả tầng hoa hồng (F0..F4)</option>
              <option value="1">Tầng 1 (Trực tiếp F0 - 20%)</option>
              <option value="2">Tầng 2 (Cấp dưới F1 - 10%)</option>
              <option value="3">Tầng 3 (Cấp dưới F2 - 5%)</option>
              <option value="4">Tầng 4 (Cấp dưới F3 - 5%)</option>
              <option value="5">Tầng 5 (Cấp dưới F4 - 5%)</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Đối tác thụ hưởng</th>
                <th className="py-2.5 px-4">Tầng / Tỷ lệ %</th>
                <th className="py-2.5 px-4">Ca điều trị nguồn</th>
                <th className="py-2.5 px-4 text-right">Doanh thu gốc</th>
                <th className="py-2.5 px-4 text-right">Tiền hoa hồng</th>
                <th className="py-2.5 px-4 text-center">Trạng thái</th>
                <th className="py-2.5 px-4">Đợt / Ngày chi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCommissions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Không tìm thấy khoản hoa hồng nào.
                  </td>
                </tr>
              ) : (
                filteredCommissions.map(comm => {
                  const ref = refMap.get(comm.referralId);
                  const partner = partnerMap.get(comm.partnerId);
                  const isPaid = comm.payoutStatus === 'PAID';

                  return (
                    <tr key={comm.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{comm.partnerName}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {partner?.code} • {partner?.bankName} ({partner?.bankAccountNo})
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          comm.tierLevel === 1
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : comm.tierLevel === 2
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : comm.tierLevel === 3
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-purple-50 text-purple-700 border-purple-200'
                        }`}>
                          Cấp {comm.tierLevel} ({comm.ratePercent}%)
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-slate-800">{ref?.patientName || 'N/A'}</span>
                          <button
                            onClick={() => ref && onViewBreakdown(ref)}
                            className="text-sky-600 hover:text-sky-800 font-mono text-[10px]"
                            title="Xem chi tiết ca khám"
                          >
                            [{comm.referralId}]
                          </button>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{ref?.serviceName}</div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-medium text-slate-700">{formatVND(comm.baseRevenue)}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-bold text-slate-900">{formatVND(comm.amount)}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                          isPaid
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {isPaid ? (
                            <>
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>Đã thanh toán</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-2.5 h-2.5" />
                              <span>Chờ chi</span>
                            </>
                          )}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {isPaid ? (
                          <div>
                            <span className="font-mono text-slate-700 font-medium">{comm.payoutBatchCode}</span>
                            <div className="text-[10px] text-slate-400">{formatDate(comm.paidAt)}</div>
                          </div>
                        ) : (
                          <span className="italic text-slate-400">Chưa quyết toán</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


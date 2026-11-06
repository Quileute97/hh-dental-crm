import React, { useState } from 'react';
import { Search, Plus, Calculator, CheckCircle2, Clock, AlertCircle, Eye, ArrowRight } from 'lucide-react';
import { formatVND, formatDate } from '../../utils/formatters';

export default function ReferralList({ 
  referrals, 
  partners, 
  onNewReferral, 
  onCalculateCommission, 
  onViewBreakdown,
  onUpdateStatus 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const partnerMap = new Map(partners.map(p => [p.id, p]));

  const filteredReferrals = referrals.filter(r => {
    const matchesSearch = 
      r.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.patientPhone.includes(searchTerm) ||
      r.serviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="bg-white border border-slate-200 rounded-lg">
      {/* Header filter controls */}
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên BN, SĐT, dịch vụ..."
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
            <option value="PENDING">Chờ tiếp nhận</option>
            <option value="IN_TREATMENT">Đang điều trị</option>
            <option value="COMPLETED">Đã hoàn thành</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
        </div>

        <button
          onClick={onNewReferral}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-md transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tiếp nhận ca khám mới</span>
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-4">Mã ca / Bệnh nhân</th>
              <th className="py-2.5 px-4">Dịch vụ điều trị</th>
              <th className="py-2.5 px-4">Đối tác giới thiệu (F1)</th>
              <th className="py-2.5 px-4 text-right">Doanh thu điều trị</th>
              <th className="py-2.5 px-4">Trạng thái điều trị</th>
              <th className="py-2.5 px-4 text-center">Hoa hồng 5 cấp</th>
              <th className="py-2.5 px-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredReferrals.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  Không tìm thấy ca giới thiệu nào.
                </td>
              </tr>
            ) : (
              filteredReferrals.map(ref => {
                const partner = partnerMap.get(ref.directPartnerId);
                const needsCalculation = ref.status === 'COMPLETED' && !ref.commissionsCalculated;

                return (
                  <tr key={ref.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{ref.patientName}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {ref.id} • {ref.patientPhone}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{ref.serviceName}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Ngày tạo: {formatDate(ref.createdAt)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{partner?.name || 'N/A'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {partner?.code} (Cấp {partner?.level})
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="font-bold text-slate-900">{formatVND(ref.revenue)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={ref.status}
                        onChange={(e) => onUpdateStatus(ref.id, e.target.value)}
                        className={`text-[11px] font-medium py-1 px-2 rounded border focus:outline-none ${
                          ref.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : ref.status === 'IN_TREATMENT'
                            ? 'bg-sky-50 text-sky-700 border-sky-300'
                            : ref.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-700 border-amber-300'
                            : 'bg-slate-100 text-slate-600 border-slate-300'
                        }`}
                      >
                        <option value="PENDING">Chờ tiếp nhận</option>
                        <option value="IN_TREATMENT">Đang điều trị</option>
                        <option value="COMPLETED">Hoàn thành (Đã thu tiền)</option>
                        <option value="CANCELLED">Hủy ca</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {needsCalculation ? (
                        <button
                          onClick={() => onCalculateCommission(ref)}
                          className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded transition-colors shadow-sm animate-pulse"
                        >
                          <Calculator className="w-3.5 h-3.5" />
                          <span>Tính hoa hồng</span>
                        </button>
                      ) : ref.commissionsCalculated ? (
                        <button
                          onClick={() => onViewBreakdown(ref)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded transition-colors"
                        >
                          <CheckCircle2 className="w-3 h-3 text-sky-600" />
                          <span>Xem phân bổ 4 tầng</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">
                          Chưa kích hoạt
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {ref.commissionsCalculated && (
                        <button
                          onClick={() => onViewBreakdown(ref)}
                          className="text-slate-500 hover:text-sky-600 p-1 rounded hover:bg-slate-100"
                          title="Xem chi tiết phân bổ"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
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
  );
}


import React, { useState } from 'react';
import { Search, Plus, Edit2, CheckCircle2, XCircle, Clock, ShieldCheck, CreditCard } from 'lucide-react';
import { formatVND } from '../../utils/formatters';

export default function PartnerList({ 
  partners, 
  settlementResult, 
  onAddPartner, 
  onEditPartner, 
  onToggleStatus 
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const partnerRows = settlementResult?.partnerRows || [];

  const filteredRows = partnerRows.filter(p => {
    const matchesSearch = 
      p.partnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.partnerCode.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-xs">
      {/* Table filters and controls */}
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên đối tác, mã REF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        <button
          onClick={() => onAddPartner()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-md transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Thêm đối tác mới</span>
        </button>
      </div>

      {/* Table 3.3 Chuẩn Plan v5 */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-4">Đối tác</th>
              <th className="py-2.5 px-4">Cấp trên</th>
              <th className="py-2.5 px-4 text-right">Sổ khách</th>
              <th className="py-2.5 px-4 text-right">Doanh thu nhánh</th>
              <th className="py-2.5 px-4 text-right">Hoa hồng CTV</th>
              <th className="py-2.5 px-4 text-right">Phí nhánh 1%</th>
              <th className="py-2.5 px-4 text-right font-bold text-slate-900">Tổng phải trả</th>
              <th className="py-2.5 px-4 text-center">Đã chốt</th>
              <th className="py-2.5 px-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400">
                  Không tìm thấy đối tác nào phù hợp.
                </td>
              </tr>
            ) : (
              filteredRows.map(row => {
                const partnerObj = partners.find(p => p.id === row.partnerId);
                const isActive = partnerObj?.status === 'ACTIVE';

                return (
                  <tr key={row.partnerId} className="hover:bg-slate-50 transition-colors">
                    {/* Cột 1: Đối tác */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{row.partnerName}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[11px] text-slate-500">{row.partnerCode}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium">
                          Độ sâu {row.depth}
                        </span>
                      </div>
                    </td>

                    {/* Cột 2: Cấp trên */}
                    <td className="py-3 px-4 text-slate-600">
                      {row.parentName}
                    </td>

                    {/* Cột 3: Sổ khách */}
                    <td className="py-3 px-4 text-right font-medium text-slate-800">
                      {formatVND(row.ownRevenue)}
                    </td>

                    {/* Cột 4: Doanh thu nhánh */}
                    <td className="py-3 px-4 text-right font-medium text-sky-700">
                      {formatVND(row.branchRevenue)}
                    </td>

                    {/* Cột 5: Hoa hồng CTV */}
                    <td className="py-3 px-4 text-right font-medium text-emerald-700">
                      {formatVND(row.commission)}
                    </td>

                    {/* Cột 6: Phí nhánh 1% */}
                    <td className="py-3 px-4 text-right font-medium text-amber-700">
                      {formatVND(row.branchFee)}
                    </td>

                    {/* Cột 7: Tổng phải trả */}
                    <td className="py-3 px-4 text-right font-bold text-slate-900 text-sm">
                      {formatVND(row.total)}
                    </td>

                    {/* Cột 8: Đã chốt (Badge) */}
                    <td className="py-3 px-4 text-center">
                      {row.isSettled ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Đã chốt</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span>Chưa chốt</span>
                        </span>
                      )}
                    </td>

                    {/* Cột 9: Thao tác */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onEditPartner(partnerObj || row)}
                          className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                          title="Sửa đối tác"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onToggleStatus(row.partnerId)}
                          className={`p-1.5 rounded transition-colors ${
                            isActive ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                          }`}
                          title={isActive ? 'Đang hoạt động (Bấm để tạm dừng)' : 'Đang tạm dừng (Bấm để kích hoạt)'}
                        >
                          {isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        </button>
                      </div>
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

import React, { useState } from 'react';
import { Search, Plus, DollarSign, Users, ChevronRight, Phone, ShieldCheck, History, Gift, FileText } from 'lucide-react';
import { formatVND, formatDate } from '../../utils/formatters';
import { calculateCustomerCredit } from '../../services/commissionEngine';

export default function CustomerList({ 
  customers, 
  visits, 
  partners, 
  onNewCustomer, 
  onOpenAddVisit,
  onViewCustomerProfile 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [depthFilter, setDepthFilter] = useState('ALL');
  const [expandedCustomerId, setExpandedCustomerId] = useState(null);

  const partnerMap = new Map(partners.map(p => [p.id, p]));
  const customerMap = new Map(customers.map(c => [c.id, c]));

  // Tính tổng doanh thu tích lũy và gom visits theo customerId
  const visitsByCustomer = new Map();
  visits.forEach(v => {
    if (!visitsByCustomer.has(v.customerId)) {
      visitsByCustomer.set(v.customerId, []);
    }
    visitsByCustomer.get(v.customerId).push(v);
  });

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone && c.phone.includes(searchTerm)) ||
      (c.code && c.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.treatment && c.treatment.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesDepth = depthFilter === 'ALL' || String(c.depth) === depthFilter;

    return matchesSearch && matchesDepth;
  });

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-xs">
      {/* Header controls & filter */}
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên, SĐT, mã KH, dịch vụ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <select
            value={depthFilter}
            onChange={(e) => setDepthFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-md py-1.5 px-2.5 bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            <option value="ALL">Tất cả độ sâu</option>
            <option value="1">Tầng 1 (Trực tiếp: CTV 20%)</option>
            <option value="2">Tầng 2 (CTV hưởng 10% | Sàn 0%)</option>
            <option value="3">Tầng 3 (CTV hưởng 5% | Sàn 0%)</option>
          </select>
        </div>

        <button
          onClick={onNewCustomer}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-md transition-colors shrink-0 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tiếp nhận khách hàng mới</span>
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-4">Mã KH / Tên khách hàng</th>
              <th className="py-2.5 px-4 text-center">Độ sâu (Depth)</th>
              <th className="py-2.5 px-4">Đối tác sở hữu (CTV)</th>
              <th className="py-2.5 px-4">Khách giới thiệu (Cha)</th>
              <th className="py-2.5 px-4">Dịch vụ điều trị</th>
              <th className="py-2.5 px-4 text-right">Doanh thu cộng dồn</th>
              <th className="py-2.5 px-4 text-center">Credit tích lũy</th>
              <th className="py-2.5 px-4 text-center">Số lần khám</th>
              <th className="py-2.5 px-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400">
                  Không tìm thấy khách hàng nào trong chuỗi.
                </td>
              </tr>
            ) : (
              filteredCustomers.map(cust => {
                const custVisits = visitsByCustomer.get(cust.id) || [];
                const totalRevenue = custVisits.reduce((sum, v) => sum + (v.amount || 0), 0);
                const owner = partnerMap.get(cust.ownerPartnerId);
                const parentCust = cust.referrerCustomerId ? customerMap.get(cust.referrerCustomerId) : null;
                const isExpanded = expandedCustomerId === cust.id;

                return (
                  <React.Fragment key={cust.id}>
                    <tr className="hover:bg-slate-50 transition-colors">
                      {/* Cột 1: Mã KH / Tên */}
                      <td className="py-3 px-4">
                        <div 
                          onClick={() => onViewCustomerProfile && onViewCustomerProfile(cust)}
                          className="font-bold text-slate-900 hover:text-sky-600 cursor-pointer transition-colors"
                          title="Bấm để xem toàn bộ hồ sơ khách hàng"
                        >
                          {cust.name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-1.5">
                          <span 
                            onClick={() => onViewCustomerProfile && onViewCustomerProfile(cust)}
                            className="hover:underline cursor-pointer"
                          >
                            {cust.code || cust.id}
                          </span>
                          <span>&bull;</span>
                          <span>{cust.phone}</span>
                        </div>
                      </td>

                      {/* Cột 2: Độ sâu (Depth) */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          cust.depth === 1 
                            ? 'bg-sky-100 text-sky-800 border border-sky-200' 
                            : cust.depth === 2
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-purple-100 text-purple-800 border border-purple-200'
                        }`}>
                          Tầng {cust.depth || 1}
                        </span>
                      </td>

                      {/* Cột 3: Đối tác CTV sở hữu */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{owner?.name || 'N/A'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{owner?.code}</div>
                      </td>

                      {/* Cột 4: Khách giới thiệu */}
                      <td className="py-3 px-4 text-slate-600">
                        {parentCust ? (
                          <div>
                            <span className="font-medium text-slate-800">{parentCust.name}</span>
                            <span className="text-[10px] text-slate-400 block font-mono">({parentCust.code})</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Trực tiếp từ CTV</span>
                        )}
                      </td>

                      {/* Cột 5: Dịch vụ */}
                      <td className="py-3 px-4 text-slate-700 max-w-[200px] truncate" title={cust.treatment}>
                        {cust.treatment || 'N/A'}
                      </td>

                      {/* Cột 6: Doanh thu cộng dồn */}
                      <td className="py-3 px-4 text-right font-bold text-emerald-700 text-sm">
                        {formatVND(totalRevenue)}
                      </td>

                      {/* Cột 6.5: Credit tích lũy từ giới thiệu */}
                      <td className="py-3 px-4 text-center">
                        {(() => {
                          const credit = calculateCustomerCredit(customers, cust.id);
                          return credit > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <Gift className="w-3 h-3 text-amber-600" />
                              <span>+{formatVND(credit)}</span>
                            </span>
                          ) : (
                            <span className="text-slate-300 font-mono text-[11px]">0 ₫</span>
                          );
                        })()}
                      </td>

                      {/* Cột 7: Số lần khám */}
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setExpandedCustomerId(isExpanded ? null : cust.id)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs text-sky-700 hover:bg-sky-50 font-medium"
                          title="Bấm để xem lịch sử các lượt khám"
                        >
                          <History className="w-3 h-3" />
                          <span>{custVisits.length} lần</span>
                        </button>
                      </td>

                      {/* Cột 8: Xem Hồ sơ & Thêm Doanh thu */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onViewCustomerProfile && onViewCustomerProfile(cust)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded transition-colors"
                            title="Xem chi tiết hồ sơ khách hàng, tiến độ gói và CTV gán cứng"
                          >
                            <FileText className="w-3.5 h-3.5 text-sky-600" />
                            <span>Hồ sơ</span>
                          </button>

                          <button
                            onClick={() => onOpenAddVisit(cust, totalRevenue)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded transition-colors"
                            title="Ghi nhận lần tái khám / điều trị bổ sung"
                          >
                            <DollarSign className="w-3.5 h-3.5 text-sky-600" />
                            <span>+ Doanh thu</span>
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Dòng mở rộng: Chi tiết các visit của khách */}
                    {isExpanded && (
                      <tr className="bg-slate-50/80">
                        <td colSpan={9} className="p-3 pl-8">
                          <div className="bg-white border border-slate-200 rounded-md p-3 text-xs space-y-2">
                            <div className="font-bold text-slate-700 flex items-center justify-between pb-1.5 border-b border-slate-100">
                              <span>Lịch sử các lượt điều trị ({custVisits.length} lần)</span>
                              <span className="text-emerald-700">Tổng tích lũy: {formatVND(totalRevenue)}</span>
                            </div>
                            <div className="divide-y divide-slate-100">
                              {custVisits.map((v, i) => (
                                <div key={v.id || i} className="py-1.5 flex items-center justify-between text-[11px]">
                                  <div className="flex items-center gap-2">
                                    <span className="w-4 h-4 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px]">
                                      {i + 1}
                                    </span>
                                    <span className="font-medium text-slate-800">{v.note || 'Lượt điều trị'}</span>
                                    <span className="text-slate-400 text-[10px]">({formatDate(v.occurredAt)})</span>
                                  </div>
                                  <span className="font-bold text-slate-900">{formatVND(v.amount)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


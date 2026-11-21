import React, { useState } from 'react';
import { CalendarClock, ArrowRight, UserCheck, Phone, Clock } from 'lucide-react';
import { formatDate } from '../../utils/formatters';

export default function BookedAppointments({
  customers = [],
  partners = [],
  onViewCustomerProfile,
  onAcceptLead,
  onUpdateStatus,
  onNavigateTab
}) {
  const [updatingId, setUpdatingId] = useState(null);

  // Lọc danh sách khách hàng đặt hẹn (status = 'lead')
  // Sắp xếp theo ngày tạo mới nhất lên đầu
  const bookedList = (customers || [])
    .filter(c => c.status === 'lead')
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

  const partnerMap = new Map((partners || []).map(p => [p.id, p]));

  function handleAccept(cust, e) {
    e.stopPropagation();
    if (onAcceptLead) {
      onAcceptLead(cust);
    } else if (onUpdateStatus) {
      setUpdatingId(cust.id);
      onUpdateStatus(cust.id, 'treating').finally(() => setUpdatingId(null));
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3.5 sm:p-4 shadow-xs flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <CalendarClock className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-xs sm:text-sm">Khách Đặt Hẹn</h3>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                {bookedList.length}
              </span>
            </div>
            <p className="text-[10px] text-slate-500">Chờ tiếp nhận tại phòng khám</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onNavigateTab('customers')}
          className="text-xs text-sky-600 hover:text-sky-700 font-semibold inline-flex items-center gap-1"
        >
          <span>Xem tất cả</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="mt-3 space-y-2.5 sm:space-y-3 flex-1 overflow-y-auto max-h-[380px] pr-0.5">
        {bookedList.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
            <Clock className="w-8 h-8 text-slate-300 mb-2 stroke-[1.5]" />
            <p className="font-medium text-slate-600 text-xs">Chưa có khách đặt hẹn mới</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
              Lịch hẹn từ VoucherNhakhoa sẽ tự động hiển thị tại đây khi khách đăng ký.
            </p>
          </div>
        ) : (
          bookedList.map(c => {
            const partner = c.ownerPartnerId ? partnerMap.get(c.ownerPartnerId) : null;
            const isProcessing = updatingId === c.id;

            return (
              <div
                key={c.id}
                onClick={() => onViewCustomerProfile && onViewCustomerProfile(c)}
                className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/60 hover:bg-sky-50/50 hover:border-sky-200 transition-all cursor-pointer flex flex-col gap-2 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {(c.name || 'K').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-900 truncate group-hover:text-sky-700">
                        {c.name}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{c.phone || 'Chưa có SĐT'}</span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium shrink-0 border border-blue-200">
                    {formatDate(c.createdAt)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-200/60 gap-2">
                  <div className="min-w-0 truncate text-slate-600">
                    <span className="font-medium text-slate-700">{c.treatment || 'Tư vấn nha khoa'}</span>
                    {partner && (
                      <span className="text-slate-400 text-[10px] block truncate">
                        CTV: {partner.name}
                      </span>
                    )}
                  </div>

                  {(onAcceptLead || onUpdateStatus) && (
                    <button
                      type="button"
                      disabled={updatingId === c.id}
                      onClick={(e) => handleAccept(c, e)}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded bg-sky-600 hover:bg-sky-700 text-white inline-flex items-center gap-1 shrink-0 transition-colors shadow-xs cursor-pointer"
                      title="Mở form tiếp nhận khách hàng"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{updatingId === c.id ? 'Đang mở...' : 'Tiếp nhận'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

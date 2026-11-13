import React, { useState } from 'react';
import { 
  Coins, 
  CheckCircle2, 
  Clock, 
  Download, 
  RotateCcw, 
  Building2, 
  CreditCard, 
  FileText,
  AlertCircle,
  Gift
} from 'lucide-react';
import { formatVND, formatDate } from '../../utils/formatters';
import { exportSettlementToCSV } from '../../services/exportService';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../config/permissions';

export default function SettlementView({ 
  month, 
  settlementResult, 
  onConfirmSettlement 
}) {
  const { role } = useAuth();
  const {
    periodRevenue = 0,
    totalCtvCommission = 0,
    totalPlatformShare = 0,
    totalBranchFee = 0,
    totalCost = 0,
    costPercent = 0,
    totalCredit = 0,
    partnerRows = [],
    isFullySettled = false,
    settlementCount = 0
  } = settlementResult || {};

  const [confirmReSettleOpen, setConfirmReSettleOpen] = useState(false);

  function handleSettleClick() {
    if (isFullySettled) {
      setConfirmReSettleOpen(true);
    } else {
      // 1.3 Client gọi chốt sổ KHÔNG gửi settlementRows
      onConfirmSettlement(month, false);
    }
  }

  function handleForceReSettle() {
    setConfirmReSettleOpen(false);
    onConfirmSettlement(month, true);
  }

  function handleExport() {
    exportSettlementToCSV(partnerRows, month);
  }

  // Lấy thời điểm chốt sổ gần nhất
  const latestSettledAt = partnerRows.find(p => p.settledAt)?.settledAt;

  return (
    <div className="space-y-4">
      {/* Banner chốt sổ & hành động */}
      <div className="bg-white border border-slate-200 rounded-lg p-3.5 sm:p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-4 shadow-xs">
        <div className="flex items-start sm:items-center gap-3 sm:gap-3.5">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            isFullySettled ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}>
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Biên Bản Đối Soát & Quyết Toán Kỳ {month}
              </h3>
              {isFullySettled ? (
                <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                  <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600" />
                  <span>ĐÃ CHỐT SỔ KỲ {month}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
                  <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600" />
                  <span>CHƯA CHỐT SỔ ({settlementCount}/{partnerRows.length} đối tác)</span>
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-1">
              {latestSettledAt 
                ? `Thời điểm chốt sổ snapshot: ${new Date(latestSettledAt).toLocaleString('vi-VN')}`
                : 'Dữ liệu đang được tính toán theo thời gian thực từ chuỗi khách và lượt khám trong kỳ.'}
            </p>
          </div>
        </div>

        {/* Action buttons: 3.5 Chốt sổ tháng & 3.6 Xuất CSV */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 w-full md:w-auto">
          {can(role, 'exportCsv') && (
            <button
              type="button"
              onClick={handleExport}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Xuất CSV đối soát (BOM)</span>
            </button>
          )}

          {can(role, 'settleMonth') && (
            isFullySettled ? (
              <button
                type="button"
                onClick={handleSettleClick}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-md transition-colors"
                title="Kỳ này đã chốt. Bấm để chốt lại nếu có thay đổi"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Đã chốt sổ (Bấm để tính lại)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSettleClick}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-md transition-colors shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Chốt sổ tháng {month}</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Tóm tắt số liệu quyết toán kỳ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-2.5 sm:p-3 text-xs">
          <span className="text-slate-500 text-[10px] block">Doanh thu kỳ</span>
          <span className="font-bold text-slate-900 text-xs sm:text-sm truncate block">{formatVND(periodRevenue)}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-2.5 sm:p-3 text-xs">
          <span className="text-emerald-600 text-[10px] block">Hoa hồng CTV</span>
          <span className="font-bold text-emerald-700 text-xs sm:text-sm truncate block">{formatVND(totalCtvCommission)}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-2.5 sm:p-3 text-xs">
          <span className="text-amber-600 text-[10px] block">Thưởng quản lý 1%</span>
          <span className="font-bold text-amber-700 text-xs sm:text-sm truncate block">{formatVND(totalBranchFee)}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-2.5 sm:p-3 text-xs">
          <span className="text-sky-600 text-[10px] block">Tổng chi trả đối tác</span>
          <span className="font-bold text-sky-700 text-xs sm:text-sm truncate block">{formatVND(totalCtvCommission + totalBranchFee)}</span>
        </div>
      </div>

      {/* 2.4 Dòng Credit đã phát cho khách giới thiệu */}
      <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="font-semibold text-amber-900">Credit đã phát cho khách giới thiệu:</span>
          <span className="font-bold text-amber-800 text-sm">{formatVND(totalCredit)}</span>
        </div>
        <span className="text-[11px] text-amber-700 italic">
          (Credit dịch vụ ưu đãi cho khách giới thiệu, không trừ vào hoa hồng đối tác)
        </span>
      </div>

      {/* Bảng Biên Bản Chốt Sổ Chi Tiết Từng Đối Tác */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
        <div className="p-3.5 sm:p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-sky-600 shrink-0" />
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
              Biên Bản Chi Trả Đối Tác Trong Kỳ ({partnerRows.length} đối tác)
            </h4>
          </div>
          <span className="text-[11px] text-slate-500">
            Tổng chi trả: <strong className="text-slate-900">{formatVND(totalCtvCommission + totalBranchFee)}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[52rem]">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 whitespace-nowrap">
              <tr>
                <th className="py-2.5 px-3 sm:px-4">Đối tác / Mã</th>
                <th className="py-2.5 px-3 sm:px-4">Cấp trên</th>
                <th className="py-2.5 px-3 sm:px-4 text-right">Sổ khách</th>
                <th className="py-2.5 px-3 sm:px-4 text-right">Doanh thu nhánh</th>
                <th className="py-2.5 px-3 sm:px-4 text-right">Hoa hồng CTV</th>
                <th className="py-2.5 px-3 sm:px-4 text-right" title="Thưởng doanh số cấp quản lí 1%">Thưởng QL 1%</th>
                <th className="py-2.5 px-3 sm:px-4 text-right font-bold text-slate-900">Tổng phải trả</th>
                <th className="py-2.5 px-3 sm:px-4">Thông tin chuyển khoản</th>
                <th className="py-2.5 px-3 sm:px-4 text-center">Trạng thái chốt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {partnerRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    Không có đối tác nào trong kỳ đối soát này.
                  </td>
                </tr>
              ) : (
                partnerRows.map(row => (
                  <tr key={row.partnerId} className="hover:bg-slate-50 transition-colors whitespace-nowrap">
                    {/* Đối tác */}
                    <td className="py-3 px-3 sm:px-4">
                      <div className="font-bold text-slate-900">{row.partnerName}</div>
                      <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                        <span>{row.partnerCode}</span>
                        <span>&bull;</span>
                        <span>Độ sâu {row.depth}</span>
                      </div>
                    </td>

                    {/* Cấp trên */}
                    <td className="py-3 px-3 sm:px-4 text-slate-600">
                      {row.parentName}
                    </td>

                    {/* Sổ khách */}
                    <td className="py-3 px-3 sm:px-4 text-right font-medium text-slate-800">
                      {formatVND(row.ownRevenue)}
                    </td>

                    {/* Doanh thu nhánh */}
                    <td className="py-3 px-3 sm:px-4 text-right font-medium text-sky-700">
                      {formatVND(row.branchRevenue)}
                    </td>

                    {/* Hoa hồng CTV */}
                    <td className="py-3 px-3 sm:px-4 text-right font-medium text-emerald-700">
                      {formatVND(row.commission)}
                    </td>

                    {/* Phí nhánh 1% */}
                    <td className="py-3 px-3 sm:px-4 text-right font-medium text-amber-700">
                      {formatVND(row.branchFee)}
                    </td>

                    {/* Tổng phải trả */}
                    <td className="py-3 px-3 sm:px-4 text-right font-bold text-slate-900 text-sm">
                      {formatVND(row.total)}
                    </td>

                    {/* Ngân hàng */}
                    <td className="py-3 px-3 sm:px-4">
                      <div className="font-medium text-slate-800">{row.bankName || 'N/A'}</div>
                      <div className="font-mono text-[11px] text-slate-500">
                        {row.bankAccountNo ? `${row.bankAccountNo} (${row.bankAccountName || ''})` : 'Chưa cập nhật'}
                      </div>
                    </td>

                    {/* Trạng thái chốt */}
                    <td className="py-3 px-3 sm:px-4 text-center">
                      {row.isSettled ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Đã chốt</span>
                          </span>
                          {row.settledAt && (
                            <span className="block text-[9px] text-slate-400 font-mono">
                              {new Date(row.settledAt).toLocaleDateString('vi-VN')}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span>Chưa chốt</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal xác nhận nếu chốt lại */}
      {confirmReSettleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 max-w-sm w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h4 className="font-bold text-slate-900 text-sm">Xác nhận chốt lại sổ kỳ {month}?</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Kỳ đối soát <strong>{month}</strong> đã có biên bản chốt trước đó. Việc chốt lại sẽ tính toán và ghi đè ảnh chụp snapshot mới cho toàn bộ các đối tác.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmReSettleOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleForceReSettle}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded shadow-sm"
              >
                Đồng ý chốt lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


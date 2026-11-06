import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, CreditCard, Building2, AlertCircle } from 'lucide-react';
import { formatVND } from '../../utils/formatters';

export default function PayoutModal({ isOpen, onClose, pendingCommissions, onConfirmPayout }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [batchCode, setBatchCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [transactionRef, setTransactionRef] = useState('');

  // SỬA LỖI CHI THIẾU: Tự động chọn TOÀN BỘ các khoản hoa hồng chờ thanh toán mỗi khi modal mở ra
  useEffect(() => {
    if (isOpen && pendingCommissions) {
      setSelectedIds(pendingCommissions.map(c => c.id));
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      setBatchCode(`PAY-BATCH-${todayStr}-${Math.floor(10 + Math.random() * 90)}`);
      setTransactionRef(`FT${Math.floor(10000000 + Math.random() * 90000000)}`);
    }
  }, [isOpen, pendingCommissions]);

  if (!isOpen) return null;

  const totalPayout = pendingCommissions
    .filter(c => selectedIds.includes(c.id))
    .reduce((sum, c) => sum + c.amount, 0);

  function handleToggleAll() {
    if (selectedIds.length === pendingCommissions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingCommissions.map(c => c.id));
    }
  }

  function handleToggleOne(id) {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (selectedIds.length === 0) return;

    onConfirmPayout({
      commissionIds: selectedIds,
      batchCode,
      paymentMethod,
      transactionRef,
      paidAt: new Date().toISOString(),
    });

    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-lg border border-slate-200 max-w-xl w-full overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-100">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Tạo Lệnh Chi Trả Hoa Hồng Đối Tác Hàng Loạt
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Đã mặc định tick chọn toàn bộ <strong>{pendingCommissions.length}</strong> khoản chờ chi để tránh chi thiếu
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <span className="text-slate-500">Mã đợt thanh toán:</span>
              <input
                type="text"
                required
                value={batchCode}
                onChange={e => setBatchCode(e.target.value)}
                className="w-full mt-1 px-2.5 py-1 border border-slate-300 rounded font-mono text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none"
              />
            </div>
            <div>
              <span className="text-slate-500">Mã giao dịch ngân hàng / Ref:</span>
              <input
                type="text"
                required
                value={transactionRef}
                onChange={e => setTransactionRef(e.target.value)}
                className="w-full mt-1 px-2.5 py-1 border border-slate-300 rounded font-mono text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-700">
                Danh sách khoản hoa hồng chờ chi ({selectedIds.length}/{pendingCommissions.length}):
              </span>
              <button
                type="button"
                onClick={handleToggleAll}
                className="text-sky-600 hover:text-sky-700 font-medium"
              >
                {selectedIds.length === pendingCommissions.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </button>
            </div>

            <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-md">
              {pendingCommissions.map(comm => {
                const isSelected = selectedIds.includes(comm.id);
                return (
                  <div
                    key={comm.id}
                    onClick={() => handleToggleOne(comm.id)}
                    className="p-2.5 flex items-center justify-between hover:bg-slate-50 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      />
                      <div>
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <span>{comm.partnerName}</span>
                          <span className="text-[10px] text-slate-500 font-normal">
                            ({comm.partnerTitle || `Cấp ${comm.partnerLevel || ''}`})
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {comm.tierName} • Ca: {comm.referralId}
                        </div>
                      </div>
                    </div>
                    <div className="font-bold text-slate-900">
                      {formatVND(comm.amount)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between">
            <div>
              <span className="text-emerald-800 font-semibold block">Tổng tiền quyết toán đợt này:</span>
              <span className="text-[11px] text-emerald-600">Đã chọn {selectedIds.length} khoản chi</span>
            </div>
            <div className="text-lg font-bold text-emerald-700">
              {formatVND(totalPayout)}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={selectedIds.length === 0}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded transition-colors shadow-sm"
            >
              Xác nhận đã chuyển khoản ({formatVND(totalPayout)})
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

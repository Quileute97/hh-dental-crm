import React, { useState } from 'react';
import { X, DollarSign, Calendar, FileText, Tag, Check } from 'lucide-react';
import { formatVND } from '../../utils/formatters';

export default function AddVisitModal({ 
  isOpen, 
  onClose, 
  customer, 
  currentTotalRevenue, 
  onSaveVisit,
  services = []
}) {
  const [amount, setAmount] = useState('5000000');
  const [note, setNote] = useState('Tái điều trị & chăm sóc định kỳ');
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().substring(0, 10));
  const [error, setError] = useState('');

  if (!isOpen || !customer) return null;

  function handleSelectPackage(service) {
    setSelectedServiceId(service.id);
    setAmount(String(service.defaultPrice));
    setNote(service.name);
    setError('');
  }

  function handleSubmit(e) {
    e.preventDefault();
    const num = parseInt(amount, 10);
    if (isNaN(num) || num <= 0) {
      setError('Vui lòng nhập số tiền điều trị hợp lệ lớn hơn 0.');
      return;
    }

    onSaveVisit({
      customerId: customer.id,
      amount: num,
      note: note.trim() || 'Tái điều trị',
      occurredAt: new Date(occurredAt).toISOString()
    });

    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-lg border border-slate-200 max-w-md w-full overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-100">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Ghi Nhận Doanh Thu Mới (+ Visit)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cộng dồn doanh thu trọn đời cho khách hàng
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
          {error && (
            <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700">
              {error}
            </div>
          )}

          {/* Thông tin khách hàng */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 text-sm">{customer.name}</span>
                <span className="text-[11px] text-slate-500 font-mono ml-2">({customer.code})</span>
              </div>
              <span className="text-[10px] font-bold bg-sky-100 text-sky-800 px-2 py-0.5 rounded">
                Độ sâu: Tầng {customer.depth || 1}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500 flex justify-between">
              <span>Doanh thu đã tích lũy:</span>
              <strong className="text-slate-800">{formatVND(currentTotalRevenue)}</strong>
            </div>
          </div>

          {/* Chọn nhanh gói dịch vụ */}
          {services.length > 0 && (
            <div className="space-y-1.5">
              <label className="block font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-sky-600" />
                <span>Chọn nhanh gói điều trị:</span>
              </label>
              <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg max-h-32 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {services.map(s => {
                    const isSelected = selectedServiceId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSelectPackage(s)}
                        className={`p-1.5 rounded text-left transition-all border flex items-center justify-between text-[11px] ${
                          isSelected
                            ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-sky-300 hover:bg-sky-50/60'
                        }`}
                      >
                        <div className="min-w-0 pr-1 truncate">
                          <span className="font-semibold block truncate">{s.name}</span>
                          <span className={`text-[10px] font-bold ${isSelected ? 'text-sky-100' : 'text-emerald-700'}`}>
                            {formatVND(s.defaultPrice)}
                          </span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Số tiền điều trị lần này (VNĐ) <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                required
                min="1000"
                step="1000"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="VD: 5000000"
                className="w-full pl-3 pr-12 py-2 border border-slate-300 rounded font-bold text-sm focus:ring-1 focus:ring-sky-500 focus:outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">
                VNĐ
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Tương đương: <strong>{formatVND(Number(amount) || 0)}</strong>
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nội dung điều trị / Ghi chú</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="VD: Tái khám chỉnh nha, đánh bóng sứ..."
              className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Ngày phát sinh điều trị</label>
            <input
              type="date"
              value={occurredAt}
              onChange={e => setOccurredAt(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-sky-500 focus:outline-none"
            />
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
              className="px-4 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded transition-colors shadow-sm"
            >
              Lưu doanh thu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


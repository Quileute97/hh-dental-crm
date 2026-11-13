import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, FileText, Tag, Check, Stethoscope, CheckCircle2, Clock } from 'lucide-react';
import { formatVND } from '../../utils/formatters';
import { getPresetStepsForService, PAYMENT_STATUSES } from '../../utils/treatmentSteps';

export default function AddVisitModal({ 
  isOpen, 
  onClose, 
  customer, 
  currentTotalRevenue, 
  onSaveVisit,
  services = []
}) {
  const [selectedService, setSelectedService] = useState('');
  const [step, setStep] = useState('');
  const [amount, setAmount] = useState('5000000');
  const [paymentStatus, setPaymentStatus] = useState('paid');
  const [note, setNote] = useState('');
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().substring(0, 10));
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && customer) {
      const custPackage = customer.treatment || services[0]?.name || 'Niềng răng trong suốt Invisalign';
      setSelectedService(custPackage);

      const steps = getPresetStepsForService(custPackage);
      // Mặc định chọn bước tiếp theo hoặc bước đầu
      const defaultStep = steps[1]?.name || steps[0]?.name || 'Gắn mắc cài / Điều trị chuyên sâu';
      setStep(defaultStep);

      const matchedS = services.find(s => s.name === custPackage);
      const stepPrice = matchedS 
        ? Math.round(matchedS.defaultPrice * (steps[1]?.defaultShare || 0.25)) 
        : 5000000;
      setAmount(String(stepPrice > 0 ? stepPrice : 5000000));
      setPaymentStatus('paid');
      setNote('');
      setOccurredAt(new Date().toISOString().substring(0, 10));
      setError('');
    }
  }, [isOpen, customer, services]);

  if (!isOpen || !customer) return null;

  const currentPresetSteps = getPresetStepsForService(selectedService);
  const matchedServiceObj = services.find(s => s.name === selectedService);

  function handlePackageChange(serviceName) {
    setSelectedService(serviceName);
    const steps = getPresetStepsForService(serviceName);
    const defaultStep = steps[1]?.name || steps[0]?.name || 'Điều trị lâm sàng';
    setStep(defaultStep);

    const s = services.find(item => item.name === serviceName);
    if (s) {
      const stepPrice = Math.round(s.defaultPrice * (steps[1]?.defaultShare || 0.25));
      if (stepPrice > 0) setAmount(String(stepPrice));
    }
  }

  function handleSelectStep(stepObj) {
    setStep(stepObj.name);
    if (matchedServiceObj) {
      const calculated = Math.round(matchedServiceObj.defaultPrice * (stepObj.defaultShare || 0.2));
      if (calculated > 0) setAmount(String(calculated));
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const num = parseInt(amount, 10);
    if (isNaN(num) || num <= 0) {
      setError('Vui lòng nhập số tiền điều trị hợp lệ lớn hơn 0.');
      return;
    }
    if (!step.trim()) {
      setError('Vui lòng nhập hoặc chọn Nội dung điều trị (Step).');
      return;
    }

    const statusLabel = paymentStatus === 'paid' 
      ? 'Đã thanh toán' 
      : paymentStatus === 'partial' 
      ? 'Thanh toán một phần' 
      : 'Chưa thanh toán';

    const composedNote = `[${step.trim()}] ${selectedService} - ${statusLabel}${note ? ` • ${note.trim()}` : ''}`;

    onSaveVisit({
      customerId: customer.id,
      amount: num,
      package: selectedService,
      step: step.trim(),
      paymentStatus,
      status: paymentStatus,
      note: composedNote,
      occurredAt: new Date(occurredAt).toISOString()
    });

    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full my-4 sm:my-6 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[94vh] sm:max-h-[92vh]">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50/70">
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Ghi Nhận Doanh Thu Đợt Khám (+ Visit)</span>
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              Cộng dồn doanh thu trọn đời & phân định rõ Gói dịch vụ và Bước điều trị
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-3.5 sm:p-5 space-y-3.5 sm:space-y-4 text-xs overflow-y-auto flex-1">
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium">
              {error}
            </div>
          )}

          {/* Thông tin khách hàng tóm tắt */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 text-sm">{customer.name}</span>
                <span className="text-[11px] text-slate-500 font-mono ml-2">({customer.code})</span>
              </div>
              <span className="text-[10px] font-bold bg-sky-100 text-sky-800 px-2 py-0.5 rounded border border-sky-200">
                Độ sâu: Tầng {customer.depth || 1}
              </span>
            </div>
            <div className="mt-1.5 text-[11px] text-slate-500 flex justify-between items-center pt-1.5 border-t border-slate-200/60">
              <span>Doanh thu đã tích lũy trước đó:</span>
              <strong className="text-emerald-700 font-bold">{formatVND(currentTotalRevenue)}</strong>
            </div>
          </div>

          {/* ================================================================= */}
          {/* PHẦN 1: CHỌN GÓI DỊCH VỤ ĐIỀU TRỊ */}
          {/* ================================================================= */}
          <div className="p-3.5 bg-sky-50/50 rounded-lg border border-sky-200 space-y-2.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
              <div className="w-5 h-5 rounded bg-sky-600 text-white flex items-center justify-center text-[10px] shrink-0">
                1
              </div>
              <span>PHẦN 1: GÓI DỊCH VỤ ĐIỀU TRỊ</span>
            </div>

            {/* Quick chips chọn gói */}
            {services.length > 0 && (
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {services.map(s => {
                  const isSelected = selectedService === s.name;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handlePackageChange(s.name)}
                      className={`px-2 py-1 rounded text-[11px] font-medium transition-all border flex items-center gap-1 ${
                        isSelected
                          ? 'bg-sky-600 text-white border-sky-600 shadow-2xs font-semibold'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-sky-300 hover:bg-sky-50'
                      }`}
                    >
                      <span>{s.name}</span>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-1 pt-1 text-[11px]">
              <span className="text-slate-600">Gói đang chọn: <strong className="text-slate-800">{selectedService}</strong></span>
              {matchedServiceObj && (
                <span className="text-sky-700 font-semibold font-mono">
                  Giá niêm yết: {formatVND(matchedServiceObj.defaultPrice)}
                </span>
              )}
            </div>
          </div>

          {/* ================================================================= */}
          {/* PHẦN 2: BƯỚC ĐIỀU TRỊ (STEP), CHI PHÍ X ĐỒNG & TRẠNG THÁI */}
          {/* ================================================================= */}
          <div className="p-3.5 bg-emerald-50/40 rounded-lg border border-emerald-200 space-y-3">
            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
              <div className="w-5 h-5 rounded bg-emerald-600 text-white flex items-center justify-center text-[10px] shrink-0">
                2
              </div>
              <span>PHẦN 2: NỘI DUNG ĐIỀU TRỊ (STEP) & CHI PHÍ ĐỢT NÀY</span>
            </div>

            {/* Gợi ý các bước mẫu */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Stethoscope className="w-3 h-3 text-emerald-600" />
                <span>Gợi ý bước điều trị của gói (Bấm để chọn nhanh):</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {currentPresetSteps.map((st, idx) => {
                  const isCurrent = step === st.name;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectStep(st)}
                      className={`px-2 py-0.5 rounded text-[11px] transition-all border flex items-center gap-1 ${
                        isCurrent
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs font-semibold'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50'
                      }`}
                    >
                      <span>{st.name}</span>
                      {isCurrent && <Check className="w-3 h-3 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Input Bước điều trị (Step) */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nội dung điều trị đợt này (Step) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={step}
                onChange={e => setStep(e.target.value)}
                placeholder="VD: Gắn mắc cài, Khám & lấy dấu, Siết răng định kỳ..."
                className="w-full px-3 py-2 sm:py-1.5 border border-slate-300 rounded-md font-semibold text-slate-800 text-base sm:text-xs bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Input Chi phí đợt này (Chi phí X đồng) */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Chi phí thực hiện đợt này (VNĐ) <span className="text-rose-500">*</span>
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
                  className="w-full pl-3 pr-12 py-2 sm:py-1.5 border border-slate-300 rounded-md font-bold text-base sm:text-sm bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-[11px]">
                  VNĐ
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Tương đương: <strong className="text-emerald-700">{formatVND(Number(amount) || 0)}</strong>
              </p>
            </div>

            {/* Trạng thái thanh toán (Payment Status) */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Trạng thái thanh toán:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_STATUSES.map(item => {
                  const isChosen = paymentStatus === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPaymentStatus(item.id)}
                      className={`py-1.5 sm:py-1 px-2 rounded-md border text-center transition-all text-[11px] font-semibold flex items-center justify-center gap-1 ${
                        isChosen
                          ? `${item.badgeClass} ring-2 ring-emerald-500/30 shadow-2xs`
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {item.id === 'paid' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ngày điều trị & Ghi chú bổ sung */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ngày thực hiện</label>
                <input
                  type="date"
                  value={occurredAt}
                  onChange={e => setOccurredAt(e.target.value)}
                  className="w-full px-3 py-2 sm:py-1.5 border border-slate-300 rounded-md text-base sm:text-xs bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ghi chú bổ sung</label>
                <input
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Ghi chú lâm sàng..."
                  className="w-full px-3 py-2 sm:py-1.5 border border-slate-300 rounded-md text-base sm:text-xs bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Footer nút hành động */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-xs inline-flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Lưu đợt điều trị</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

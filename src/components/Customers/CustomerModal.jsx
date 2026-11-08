import React, { useState, useEffect } from 'react';
import { X, Users, Tag, Check, Plus, Stethoscope, DollarSign, CheckCircle2, Clock, Sparkles, Layers } from 'lucide-react';
import { formatVND } from '../../utils/formatters';
import { getPresetStepsForService, PAYMENT_STATUSES } from '../../utils/treatmentSteps';
import { generateUuid, isUuid } from '../../utils/uuid';

export default function CustomerModal({ 
  isOpen, 
  onClose, 
  onSaveCustomer, 
  partners, 
  customers, 
  services,
  onOpenManageServices
}) {
  const defaultService = services[0] || { name: 'Niềng răng trong suốt Invisalign', defaultPrice: 45000000 };
  const initialSteps = getPresetStepsForService(defaultService.name);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    treatment: defaultService.name,
    packagePrice: defaultService.defaultPrice || 0,
    step: initialSteps[0]?.name || 'Khám & Tư vấn phác đồ',
    initialAmount: String(Math.round((defaultService.defaultPrice || 20000000) * 0.3)), // Đợt 1 thường ứng trước 30-50%
    paymentStatus: 'paid', // 'paid' | 'partial' | 'pending'
    ownerPartnerId: partners[0]?.id || '',
    referrerCustomerId: '',
    status: 'completed',
    note: ''
  });

  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const s = services[0] || { name: 'Niềng răng trong suốt Invisalign', defaultPrice: 45000000 };
      const steps = getPresetStepsForService(s.name);
      setFormData({
        name: '',
        phone: '',
        treatment: s.name,
        packagePrice: s.defaultPrice || 0,
        step: steps[0]?.name || 'Khám & Tư vấn phác đồ',
        initialAmount: String(Math.round((s.defaultPrice || 20000000) * 0.3)),
        paymentStatus: 'paid',
        ownerPartnerId: partners[0]?.id || '',
        referrerCustomerId: '',
        status: 'completed',
        note: ''
      });
      setError('');
    }
  }, [isOpen, partners, services]);

  if (!isOpen) return null;

  const currentPresetSteps = getPresetStepsForService(formData.treatment);

  function handleReferrerChange(refCustId) {
    if (refCustId) {
      const parentCustomer = customers.find(c => c.id === refCustId);
      setFormData(prev => ({
        ...prev,
        referrerCustomerId: refCustId,
        ownerPartnerId: parentCustomer?.ownerPartnerId || prev.ownerPartnerId
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        referrerCustomerId: '',
      }));
    }
  }

  function handleServiceChange(serviceName) {
    const s = services.find(item => item.name === serviceName);
    const steps = getPresetStepsForService(serviceName);
    const price = s ? s.defaultPrice : 0;
    const defaultStep = steps[0]?.name || 'Khám & Lên phác đồ';
    const estimatedFirstPayment = Math.round(price * (steps[0]?.defaultShare || 0.3));

    setFormData(prev => ({
      ...prev,
      treatment: serviceName,
      packagePrice: price,
      step: defaultStep,
      initialAmount: String(estimatedFirstPayment > 0 ? estimatedFirstPayment : price)
    }));
  }

  function handleSelectStep(stepObj) {
    const calculatedAmount = Math.round((formData.packagePrice || 0) * (stepObj.defaultShare || 0.25));
    setFormData(prev => ({
      ...prev,
      step: stepObj.name,
      initialAmount: calculatedAmount > 0 ? String(calculatedAmount) : prev.initialAmount
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Vui lòng nhập tên khách hàng.');
      return;
    }
    if (!formData.phone.trim()) {
      setError('Vui lòng nhập số điện thoại.');
      return;
    }
    if (!formData.ownerPartnerId && !formData.referrerCustomerId) {
      setError('Vui lòng chỉ định đối tác sở hữu (CTV).');
      return;
    }
    if (!formData.step.trim()) {
      setError('Vui lòng nhập hoặc chọn Nội dung điều trị (Step).');
      return;
    }

    const parentCust = formData.referrerCustomerId 
      ? customers.find(c => c.id === formData.referrerCustomerId) 
      : null;

    const computedDepth = parentCust ? (parentCust.depth || 1) + 1 : 1;
    const finalOwnerPartnerId = parentCust ? parentCust.ownerPartnerId : formData.ownerPartnerId;

    const newCustomerId = generateUuid();
    const code = `KH-${new Date().getFullYear()}-${String(customers.length + 1).padStart(4, '0')}`;

    const newCustomer = {
      id: newCustomerId,
      code,
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      ownerPartnerId: (finalOwnerPartnerId && isUuid(finalOwnerPartnerId)) ? finalOwnerPartnerId : null,
      referrerCustomerId: (formData.referrerCustomerId && isUuid(formData.referrerCustomerId)) ? formData.referrerCustomerId : null,
      depth: computedDepth,
      treatment: formData.treatment,
      currentStep: formData.step.trim(),
      status: formData.status,
      createdAt: new Date().toISOString()
    };

    const statusLabel = formData.paymentStatus === 'paid' 
      ? 'Đã thanh toán' 
      : formData.paymentStatus === 'partial' 
      ? 'Thanh toán một phần' 
      : 'Chưa thanh toán';

    const composedNote = `[${formData.step.trim()}] ${formData.treatment} - ${statusLabel}${formData.note ? ` • Ghi chú: ${formData.note.trim()}` : ''}`;

    const initialVisit = {
      id: generateUuid(),
      customerId: newCustomerId,
      amount: parseInt(formData.initialAmount, 10) || 0,
      package: formData.treatment,
      step: formData.step.trim(),
      paymentStatus: formData.paymentStatus,
      status: formData.paymentStatus,
      note: composedNote,
      occurredAt: new Date().toISOString()
    };

    onSaveCustomer(newCustomer, initialVisit);
    onClose();
  }

  const selectedParentCust = formData.referrerCustomerId
    ? customers.find(c => c.id === formData.referrerCustomerId)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl border border-slate-200 max-w-2xl w-full my-6 overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50/70">
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-600" />
              <span>Tiếp Nhận Khách Hàng & Chỉ Định Gói Điều Trị</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tách biệt Gói tổng thể & Bước điều trị lâm sàng theo buổi khám (Step)
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5 text-xs overflow-y-auto flex-1">
          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 font-medium">
              {error}
            </div>
          )}

          {/* KHỐI 1: THÔNG TIN KHÁCH HÀNG & CTV BẢO TRỢ */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tên khách hàng <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Nguyễn Văn Nam"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Số điện thoại <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="09xx xxx xxx"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md focus:ring-1 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Phân cấp chuỗi khách & CTV */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <label className="block font-semibold text-slate-800">
                Khách hàng giới thiệu (Referrer Customer)
              </label>
              <select
                value={formData.referrerCustomerId}
                onChange={e => handleReferrerChange(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md bg-white text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none"
              >
                <option value="">Không có (Khách trực tiếp từ CTV — Tầng 1)</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code || c.id}) — Đang ở Tầng {c.depth || 1}
                  </option>
                ))}
              </select>

              {selectedParentCust ? (
                <div className="text-[11px] text-sky-800 bg-sky-50 p-2 rounded-md border border-sky-200 flex justify-between items-center">
                  <span>Suy ra độ sâu mới: <strong>Tầng {(selectedParentCust.depth || 1) + 1}</strong></span>
                  <span>Kế thừa CTV: <strong>{partners.find(p => p.id === selectedParentCust.ownerPartnerId)?.name}</strong></span>
                </div>
              ) : (
                <div>
                  <label className="block font-semibold text-slate-700 mt-2 mb-1">
                    Chỉ định Đối tác CTV sở hữu khách <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.ownerPartnerId}
                    onChange={e => setFormData({ ...formData, ownerPartnerId: e.target.value })}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-md bg-white text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  >
                    {partners.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code}) — {p.title || `Độ sâu ${p.depth}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* ================================================================= */}
          {/* PHẦN 1: CHỌN GÓI DỊCH VỤ ĐIỀU TRỊ (TREATMENT PACKAGE) */}
          {/* ================================================================= */}
          <div className="p-4 bg-sky-50/50 rounded-xl border border-sky-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-sky-600 text-white flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                    PHẦN 1: CHỌN GÓI DỊCH VỤ ĐIỀU TRỊ
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Phác đồ điều trị trọn gói được chỉ định cho khách hàng
                  </p>
                </div>
              </div>
              {onOpenManageServices && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenManageServices();
                  }}
                  className="text-[11px] text-sky-600 hover:text-sky-800 hover:underline font-medium inline-flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Quản lý gói</span>
                </button>
              )}
            </div>

            {/* Quick chips selector */}
            <div className="p-2 bg-white border border-sky-100 rounded-lg max-h-36 overflow-y-auto space-y-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {services.map(s => {
                  const isSelected = formData.treatment === s.name;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleServiceChange(s.name)}
                      className={`p-2 rounded-md text-left transition-all border flex items-center justify-between ${
                        isSelected
                          ? 'bg-sky-600 text-white border-sky-600 shadow-xs ring-1 ring-sky-600'
                          : 'bg-slate-50/70 text-slate-700 border-slate-200 hover:border-sky-300 hover:bg-sky-50/60'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-semibold text-[11px] truncate">{s.name}</div>
                        <div className={`text-[10px] font-bold ${isSelected ? 'text-sky-100' : 'text-emerald-700'}`}>
                          {formatVND(s.defaultPrice)}
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Thông tin giá trọn gói niêm yết */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Gói dịch vụ đã chọn</label>
                <select
                  value={formData.treatment}
                  onChange={e => handleServiceChange(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md bg-white text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none"
                >
                  {services.map(s => (
                    <option key={s.id} value={s.name}>
                      {s.name} — {formatVND(s.defaultPrice)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Giá trị gói niêm yết</label>
                <div className="px-3 py-1.5 bg-white border border-slate-300 rounded-md font-bold text-sky-900 text-xs flex items-center justify-between">
                  <span>{formatVND(formData.packagePrice)}</span>
                  <span className="text-[10px] text-slate-400 font-normal">Trọn gói phác đồ</span>
                </div>
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* PHẦN 2: NỘI DUNG ĐIỀU TRỊ ĐỢT NÀY (STEP) & THANH TOÁN */}
          {/* ================================================================= */}
          <div className="p-4 bg-emerald-50/40 rounded-xl border border-emerald-200 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                2
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                  PHẦN 2: BƯỚC ĐIỀU TRỊ HÔM NAY (STEP) & CHI PHÍ
                </h4>
                <p className="text-[11px] text-slate-500">
                  Ghi nhận thực tế hôm nay khách làm bước nào, chi phí bao nhiêu và trạng thái thanh toán
                </p>
              </div>
            </div>

            {/* Bước điều trị gợi ý theo gói (Preset Steps) */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
                <span>Gợi ý bước điều trị của gói (Bấm để chọn nhanh):</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {currentPresetSteps.map((st, idx) => {
                  const isCurrent = formData.step === st.name;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectStep(st)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all border flex items-center gap-1 ${
                        isCurrent
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs font-semibold'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50'
                      }`}
                    >
                      <span>{idx + 1}. {st.name}</span>
                      {isCurrent && <Check className="w-3 h-3 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Input Bước điều trị & Chi phí đợt này */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nội dung điều trị (Step) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.step}
                  onChange={e => setFormData({ ...formData, step: e.target.value })}
                  placeholder="VD: Gắn mắc cài, Lấy dấu, Siết răng..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-semibold text-slate-800 text-xs bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Chi phí đợt này (VNĐ) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    required
                    value={formData.initialAmount}
                    onChange={e => setFormData({ ...formData, initialAmount: e.target.value })}
                    className="w-full pl-3 pr-12 py-1.5 border border-slate-300 rounded-md font-bold text-xs bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-[11px]">
                    VNĐ
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Tương đương: <strong className="text-emerald-700">{formatVND(Number(formData.initialAmount) || 0)}</strong>
                </p>
              </div>
            </div>

            {/* Trạng thái thanh toán (Payment Status) */}
            <div className="pt-2">
              <label className="block font-semibold text-slate-700 mb-1.5">
                Trạng thái thanh toán đợt này:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_STATUSES.map(item => {
                  const isChosen = formData.paymentStatus === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, paymentStatus: item.id })}
                      className={`py-1.5 px-2 rounded-lg border text-center transition-all text-[11px] font-semibold flex items-center justify-center gap-1.5 ${
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

            {/* Ghi chú thêm */}
            <div className="pt-1">
              <label className="block font-semibold text-slate-700 mb-1">Ghi chú bác sĩ / Dặn dò lâm sàng</label>
              <input
                type="text"
                value={formData.note}
                onChange={e => setFormData({ ...formData, note: e.target.value })}
                placeholder="VD: Khách hẹn tái khám sau 3 tuần, gắn mắc cài hàm trên..."
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-xs bg-white focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
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
              className="px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors shadow-sm inline-flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Tiếp nhận khách hàng</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

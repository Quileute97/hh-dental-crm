import React, { useState, useEffect } from 'react';
import { X, Users, AlertTriangle, Sparkles, Tag, Check, Plus } from 'lucide-react';
import { formatVND } from '../../utils/formatters';

export default function CustomerModal({ 
  isOpen, 
  onClose, 
  onSaveCustomer, 
  partners, 
  customers, 
  services,
  onOpenManageServices
}) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    treatment: services[0]?.name || 'Cấy ghép Implant Straumann (Thuỵ Sĩ)',
    initialAmount: services[0]?.defaultPrice || 20000000,
    ownerPartnerId: partners[0]?.id || '',
    referrerCustomerId: '',
    status: 'completed',
    note: 'Gói điều trị đầu tiên'
  });

  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        phone: '',
        treatment: services[0]?.name || 'Cấy ghép Implant Straumann (Thuỵ Sĩ)',
        initialAmount: services[0]?.defaultPrice || 20000000,
        ownerPartnerId: partners[0]?.id || '',
        referrerCustomerId: '',
        status: 'completed',
        note: 'Gói điều trị đầu tiên'
      });
      setError('');
    }
  }, [isOpen, partners, services]);

  if (!isOpen) return null;

  function handleReferrerChange(refCustId) {
    if (refCustId) {
      const parentCustomer = customers.find(c => c.id === refCustId);
      setFormData(prev => ({
        ...prev,
        referrerCustomerId: refCustId,
        // Kế thừa ownerPartnerId từ khách giới thiệu
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
    setFormData(prev => ({
      ...prev,
      treatment: serviceName,
      initialAmount: s ? s.defaultPrice : prev.initialAmount
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

    const parentCust = formData.referrerCustomerId 
      ? customers.find(c => c.id === formData.referrerCustomerId) 
      : null;

    const computedDepth = parentCust ? (parentCust.depth || 1) + 1 : 1;
    const finalOwnerPartnerId = parentCust ? parentCust.ownerPartnerId : formData.ownerPartnerId;

    const newCustomerId = `CUST-${Date.now()}`;
    const code = `KH-${new Date().getFullYear()}-${String(customers.length + 1).padStart(4, '0')}`;

    const newCustomer = {
      id: newCustomerId,
      code,
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      ownerPartnerId: finalOwnerPartnerId,
      referrerCustomerId: formData.referrerCustomerId || null,
      depth: computedDepth,
      treatment: formData.treatment,
      status: formData.status,
      createdAt: new Date().toISOString()
    };

    const initialVisit = {
      id: `VISIT-${Date.now()}-1`,
      customerId: newCustomerId,
      amount: parseInt(formData.initialAmount, 10) || 0,
      note: formData.note.trim() || 'Gói điều trị ban đầu',
      occurredAt: new Date().toISOString()
    };

    onSaveCustomer(newCustomer, initialVisit);
    onClose();
  }

  const selectedParentCust = formData.referrerCustomerId
    ? customers.find(c => c.id === formData.referrerCustomerId)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-lg border border-slate-200 max-w-lg w-full overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-100">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Tiếp Nhận Khách Hàng Mới (Chuỗi Khách V5)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tự động tính độ sâu (Depth) và kế thừa đối tác CTV bảo trợ
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

          <div className="grid grid-cols-2 gap-3">
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
                className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-sky-500 focus:outline-none"
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
                className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Chọn khách hàng giới thiệu (Cấp cha trong chuỗi khách) */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <label className="block font-semibold text-slate-800">
              Khách hàng giới thiệu (Referrer Customer)
            </label>
            <select
              value={formData.referrerCustomerId}
              onChange={e => handleReferrerChange(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none"
            >
              <option value="">Không có (Khách trực tiếp từ CTV — Độ sâu 1)</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code || c.id}) — Đang ở Tầng {c.depth || 1}
                </option>
              ))}
            </select>

            {selectedParentCust ? (
              <div className="text-[11px] text-sky-800 bg-sky-50 p-2 rounded border border-sky-200 flex justify-between items-center">
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
                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none"
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

          {/* Gói điều trị & Chọn nhanh gói */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-sky-600" />
                <span>Chọn nhanh gói dịch vụ điều trị:</span>
              </label>
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
                  <span>Quản lý / Thêm gói</span>
                </button>
              )}
            </div>

            {/* Quick chips selector */}
            <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg max-h-36 overflow-y-auto space-y-1">
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
                          ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:border-sky-300 hover:bg-sky-50/60'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <div className="font-semibold text-[11px] truncate">{s.name}</div>
                        <div className={`text-[10px] font-bold ${isSelected ? 'text-sky-100' : 'text-emerald-700'}`}>
                          {formatVND(s.defaultPrice)}
                        </div>
                      </div>
                      {isSelected ? (
                        <Check className="w-4 h-4 text-white shrink-0" />
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono">#{s.id}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chi tiết gói & Doanh thu ban đầu tùy chỉnh */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên gói đã chọn</label>
                <select
                  value={formData.treatment}
                  onChange={e => handleServiceChange(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none"
                >
                  {services.map(s => (
                    <option key={s.id} value={s.name}>
                      {s.name} — {formatVND(s.defaultPrice)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Doanh thu gói ban đầu (VNĐ)</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.initialAmount}
                  onChange={e => setFormData({ ...formData, initialAmount: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-semibold text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Tương đương: <strong className="text-emerald-700">{formatVND(Number(formData.initialAmount) || 0)}</strong>
                </p>
              </div>
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
              className="px-4 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded transition-colors shadow-sm"
            >
              Tiếp nhận khách hàng
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


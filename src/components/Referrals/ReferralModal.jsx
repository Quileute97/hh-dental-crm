import React, { useState } from 'react';
import { X, Sparkles, Building2, User, Phone } from 'lucide-react';
import { formatVND } from '../../utils/formatters';

export default function ReferralModal({ isOpen, onClose, onSave, partners, services }) {
  const [formData, setFormData] = useState({
    patientName: '',
    patientPhone: '',
    serviceName: services[0]?.name || '',
    revenue: services[0]?.defaultPrice || 20000000,
    directPartnerId: partners[partners.length - 1]?.id || '',
    status: 'IN_TREATMENT',
    notes: '',
  });

  const [error, setError] = useState('');

  if (!isOpen) return null;

  function handleServiceChange(serviceName) {
    const s = services.find(item => item.name === serviceName);
    setFormData(prev => ({
      ...prev,
      serviceName,
      revenue: s ? s.defaultPrice : prev.revenue,
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!formData.patientName.trim()) {
      setError('Vui lòng nhập tên bệnh nhân.');
      return;
    }
    if (!formData.patientPhone.trim()) {
      setError('Vui lòng nhập số điện thoại bệnh nhân.');
      return;
    }
    if (!formData.directPartnerId) {
      setError('Vui lòng chọn đối tác giới thiệu trực tiếp.');
      return;
    }

    onSave({
      ...formData,
      id: `REF-2026-${String(Math.floor(Math.random() * 900) + 100)}`,
      createdAt: new Date().toISOString(),
      completedAt: formData.status === 'COMPLETED' ? new Date().toISOString() : null,
      commissionsCalculated: false,
    });

    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-lg border border-slate-200 max-w-lg w-full overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-100">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Tiếp Nhận Ca Giới Thiệu Khám Mới</h3>
            <p className="text-xs text-slate-500 mt-0.5">Gắn mã đối tác F1 và dự toán doanh thu điều trị</p>
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
            <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tên bệnh nhân <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.patientName}
                onChange={e => setFormData({ ...formData, patientName: e.target.value })}
                placeholder="VD: Hoàng Thị E"
                className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Số điện thoại liên hệ <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.patientPhone}
                onChange={e => setFormData({ ...formData, patientPhone: e.target.value })}
                placeholder="09xx xxx xxx"
                className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Dịch vụ nha khoa chỉ định
            </label>
            <select
              value={formData.serviceName}
              onChange={e => handleServiceChange(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
            >
              {services.map(s => (
                <option key={s.id} value={s.name}>
                  {s.name} ({formatVND(s.defaultPrice)})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Doanh thu thực thu dự kiến (VND)
              </label>
              <input
                type="number"
                min="0"
                step="500000"
                value={formData.revenue}
                onChange={e => setFormData({ ...formData, revenue: Number(e.target.value) })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-semibold text-slate-900 focus:ring-1 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Trạng thái điều trị
              </label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
              >
                <option value="PENDING">Chờ tiếp nhận</option>
                <option value="IN_TREATMENT">Đang điều trị</option>
                <option value="COMPLETED">Hoàn tất (Đã thu tiền)</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <label className="block font-semibold text-slate-800 mb-1">
              Đối tác giới thiệu trực tiếp (Level 1 Referrer) <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.directPartnerId}
              onChange={e => setFormData({ ...formData, directPartnerId: e.target.value })}
              className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
            >
              <option value="">-- Chọn đối tác giới thiệu --</option>
              {partners.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code}) — Cấp {p.level}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1.5">
              Hệ thống sẽ tự động duyệt cây từ đối tác này lên tuyến trên để chia hoa hồng 4 tầng.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Ghi chú lâm sàng / ca khám</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="VD: Hẹn tái khám sau 3 ngày..."
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
              Tạo ca giới thiệu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


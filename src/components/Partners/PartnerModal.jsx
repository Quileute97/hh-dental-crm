import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, ShieldCheck, Check } from 'lucide-react';
import { validateParentAssignment } from '../../services/commissionEngine';
import { generateUuid, isUuid } from '../../utils/uuid';

export default function PartnerModal({ isOpen, onClose, onSave, partnerToEdit, partners, defaultParentId }) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    phone: '',
    email: '',
    parentId: defaultParentId || '',
    depth: 0,
    status: 'ACTIVE',
    bankName: 'Vietcombank',
    bankAccountNo: '',
    bankAccountName: '',
  });

  const [error, setError] = useState('');

  useEffect(() => {
    if (partnerToEdit) {
      setFormData({
        name: partnerToEdit.name || '',
        code: partnerToEdit.code || '',
        phone: partnerToEdit.phone || '',
        email: partnerToEdit.email || '',
        parentId: partnerToEdit.parentId || '',
        depth: partnerToEdit.depth !== undefined ? partnerToEdit.depth : 0,
        status: partnerToEdit.status || 'ACTIVE',
        bankName: partnerToEdit.bankName || 'Vietcombank',
        bankAccountNo: partnerToEdit.bankAccountNo || '',
        bankAccountName: partnerToEdit.bankAccountName || '',
      });
    } else {
      const generatedCode = `REF-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const parent = partners.find(p => p.id === defaultParentId);
      const computedDepth = parent ? (parent.depth !== undefined ? parent.depth + 1 : 1) : 0;
      setFormData({
        name: '',
        code: generatedCode,
        phone: '',
        email: '',
        parentId: defaultParentId || '',
        depth: computedDepth,
        status: 'ACTIVE',
        bankName: 'Vietcombank',
        bankAccountNo: '',
        bankAccountName: '',
      });
    }
    setError('');
  }, [partnerToEdit, defaultParentId, partners, isOpen]);

  if (!isOpen) return null;

  function handleParentChange(newParentId) {
    const parent = partners.find(p => p.id === newParentId);
    const computedDepth = parent ? (parent.depth !== undefined ? parent.depth + 1 : 1) : 0;
    setFormData(prev => ({
      ...prev,
      parentId: newParentId,
      depth: computedDepth,
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Vui lòng nhập họ và tên đối tác.');
      return;
    }
    if (!formData.code.trim()) {
      setError('Vui lòng nhập mã đối tác (REF code).');
      return;
    }
    if (!formData.phone.trim()) {
      setError('Vui lòng nhập số điện thoại.');
      return;
    }

    // Kiểm tra vòng lặp cha-con (chặn cycle)
    const validation = validateParentAssignment(partnerToEdit?.id, formData.parentId || null, partners);
    if (!validation.isValid) {
      setError(validation.error);
      return;
    }

    onSave({
      ...formData,
      parentId: (formData.parentId && isUuid(formData.parentId)) ? formData.parentId : null,
      id: (partnerToEdit && isUuid(partnerToEdit.id)) ? partnerToEdit.id : generateUuid(),
      title: formData.parentId ? `Đối tác Tuyến ${formData.depth}` : 'Bác sĩ Sáng lập (Gốc)',
    });

    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-lg border border-slate-200 max-w-lg w-full overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-100">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              {partnerToEdit ? 'Chỉnh Sửa Hồ Sơ Đối Tác' : 'Thêm Đối Tác Mới Vào Cây Phả Hệ'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Hệ thống không giới hạn số tầng — Hưởng 1% phí nhánh toàn cây con
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
            <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Họ và tên đối tác <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="VD: Trần Văn Bình"
                className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Mã đối tác (REF Code) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="REF-XXX"
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono focus:ring-1 focus:ring-sky-500 focus:outline-none uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
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

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email liên hệ</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="doitac@gmail.com"
                className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-1 focus:ring-sky-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Phân cấp tuyến trên - Không giới hạn số tầng */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
            <label className="block font-semibold text-slate-800">
              Chỉ định Tuyến trên (Parent Partner)
            </label>
            <select
              value={formData.parentId}
              onChange={e => handleParentChange(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white focus:ring-1 focus:ring-sky-500 focus:outline-none"
            >
              <option value="">Không có (Là Đối tác Gốc / Bác sĩ Sáng lập — Độ sâu 0)</option>
              {partners
                .filter(p => !partnerToEdit || p.id !== partnerToEdit.id)
                .map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code}) — Độ sâu {p.depth !== undefined ? p.depth : 0}
                  </option>
                ))}
            </select>

            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200">
              <span className="text-slate-500">Độ sâu suy ra trong cây đối tác:</span>
              <span className="font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded">
                Độ sâu (Depth): {formData.depth} {formData.depth === 0 ? '(Gốc)' : `(Tuyến ${formData.depth})`}
              </span>
            </div>
          </div>

          {/* Ngân hàng chuyển khoản */}
          <div className="space-y-2">
            <span className="block font-semibold text-slate-700">Thông tin tài khoản nhận thanh toán</span>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <select
                  value={formData.bankName}
                  onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                  className="w-full px-2 py-1.5 border border-slate-300 rounded bg-white text-xs"
                >
                  <option value="Vietcombank">Vietcombank</option>
                  <option value="Techcombank">Techcombank</option>
                  <option value="MB Bank">MB Bank</option>
                  <option value="ACB">ACB</option>
                  <option value="VPBank">VPBank</option>
                  <option value="BIDV">BIDV</option>
                  <option value="VietinBank">VietinBank</option>
                </select>
              </div>
              <div className="col-span-2">
                <input
                  type="text"
                  value={formData.bankAccountNo}
                  onChange={e => setFormData({ ...formData, bankAccountNo: e.target.value })}
                  placeholder="Số tài khoản ngân hàng"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Action buttons */}
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
              {partnerToEdit ? 'Cập nhật đối tác' : 'Lưu đối tác mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, UserCheck, CreditCard } from 'lucide-react';
import PartnerIdCardUploader from './PartnerIdCardUploader';

export default function PartnerSelfProfileModal({ isOpen, onClose, partner, onSaveProfile }) {
  const [formData, setFormData] = useState({
    idCardFront: '',
    idCardBack: '',
    bankName: 'Vietcombank',
    bankAccountNo: '',
    bankAccountName: '',
  });
  const [error, setError] = useState('');
  const [isUploadingIdCard, setIsUploadingIdCard] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !partner) return;
    setFormData({
      idCardFront: partner.idCardFront || '',
      idCardBack: partner.idCardBack || '',
      bankName: partner.bankName || 'Vietcombank',
      bankAccountNo: partner.bankAccountNo || '',
      bankAccountName: partner.bankAccountName || '',
    });
    setError('');
    setIsUploadingIdCard(false);
    setIsSaving(false);
  }, [isOpen, partner]);

  if (!isOpen || !partner) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (isUploadingIdCard || isSaving) return;
    setError('');
    setIsSaving(true);

    try {
      const res = await onSaveProfile({
        partnerId: partner.id,
        idCardFront: formData.idCardFront || null,
        idCardBack: formData.idCardBack || null,
        bankName: formData.bankName,
        bankAccountNo: formData.bankAccountNo.trim(),
        bankAccountName: formData.bankAccountName.trim().toUpperCase(),
      });

      if (res && res.ok === false) {
        setError(res.error || 'Không thể lưu hồ sơ đối tác.');
        return;
      }
      onClose();
    } catch (err) {
      setError(err?.message || 'Lỗi khi lưu hồ sơ đối tác.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl border border-slate-200 max-w-2xl w-full my-4 sm:my-6 max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-100">
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Hồ Sơ Đối Tác &amp; Xác Minh CCCD
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                Tải lên hình chụp Căn cước công dân và thông tin tài khoản nhận hoa hồng
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/70 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 text-xs">
          <div className="p-3.5 sm:p-5 space-y-3.5 sm:space-y-4 overflow-y-auto flex-1">
            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Thông tin định danh cơ bản (Read-only) */}
            <div className="p-3.5 bg-sky-50/60 border border-sky-200 rounded-lg grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
              <div>
                <span className="text-[10px] text-slate-500 block">Họ và tên</span>
                <span className="font-bold text-slate-900 text-xs sm:text-sm truncate block">{partner.name}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Mã đối tác</span>
                <span className="font-mono font-bold text-sky-700 text-xs sm:text-sm truncate block">{partner.code}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Số điện thoại</span>
                <span className="font-medium text-slate-800 text-xs truncate block">{partner.phone || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Cấp đối tác</span>
                <span className="font-semibold text-slate-800 text-xs truncate block">
                  {partner.depth === 0 ? 'F0 (Gốc)' : `Tuyến ${partner.depth ?? 0}`}
                </span>
              </div>
            </div>

            {/* Upload CCCD 2 mặt */}
            <PartnerIdCardUploader
              partnerId={partner.id}
              frontUrl={formData.idCardFront}
              backUrl={formData.idCardBack}
              onChangeFront={url => setFormData(prev => ({ ...prev, idCardFront: url || '' }))}
              onChangeBack={url => setFormData(prev => ({ ...prev, idCardBack: url || '' }))}
              onUploadingChange={setIsUploadingIdCard}
              disabled={isSaving}
            />

            {/* Thông tin tài khoản ngân hàng */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                <CreditCard className="w-3.5 h-3.5 text-sky-600" />
                <span>Tài khoản ngân hàng nhận hoa hồng</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Ngân hàng</label>
                  <select
                    value={formData.bankName}
                    onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                    className="w-full px-2.5 py-2 sm:py-1.5 border border-slate-300 rounded bg-white text-base sm:text-xs"
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
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Số tài khoản</label>
                  <input
                    type="text"
                    value={formData.bankAccountNo}
                    onChange={e => setFormData({ ...formData, bankAccountNo: e.target.value })}
                    placeholder="Nhập số tài khoản"
                    className="w-full px-3 py-2 sm:py-1.5 border border-slate-300 rounded font-mono text-base sm:text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">Tên chủ tài khoản</label>
                  <input
                    type="text"
                    value={formData.bankAccountName}
                    onChange={e => setFormData({ ...formData, bankAccountName: e.target.value.toUpperCase() })}
                    placeholder="NGUYEN VAN A"
                    className="w-full px-3 py-2 sm:py-1.5 border border-slate-300 rounded text-base sm:text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none bg-white uppercase"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/70 rounded transition-colors"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={isUploadingIdCard || isSaving}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 disabled:cursor-not-allowed rounded transition-colors shadow-sm"
            >
              {isUploadingIdCard
                ? 'Đang tải ảnh CCCD...'
                : isSaving
                ? 'Đang lưu...'
                : 'Lưu hồ sơ & Ảnh CCCD'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


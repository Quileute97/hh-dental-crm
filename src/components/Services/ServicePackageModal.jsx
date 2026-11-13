import React, { useState } from 'react';
import { X, Plus, Pencil, Trash2, Tag, Check, AlertCircle, PackageCheck, DollarSign } from 'lucide-react';
import { formatVND } from '../../utils/formatters';
import { generateUuid, isUuid } from '../../utils/uuid';

export default function ServicePackageModal({
  isOpen,
  onClose,
  services = [],
  onSaveService,
  onDeleteService
}) {
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    defaultPrice: '',
    description: ''
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  function handleStartEdit(service) {
    setEditingId(service.id);
    setFormData({
      name: service.name || '',
      defaultPrice: service.defaultPrice || '',
      description: service.description || ''
    });
    setError('');
  }

  function handleCancelEdit() {
    setEditingId(null);
    setFormData({
      name: '',
      defaultPrice: '',
      description: ''
    });
    setError('');
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      setError('Vui lòng nhập tên gói dịch vụ.');
      return;
    }

    const priceNum = parseInt(formData.defaultPrice, 10);
    if (isNaN(priceNum) || priceNum < 0) {
      setError('Vui lòng nhập đơn giá hợp lệ (>= 0 VNĐ).');
      return;
    }

    // Check duplicate name
    const isDuplicate = services.some(
      s => s.name.toLowerCase() === trimmedName.toLowerCase() && s.id !== editingId
    );
    if (isDuplicate) {
      setError('Tên gói dịch vụ này đã tồn tại trong hệ thống.');
      return;
    }

    const serviceData = {
      id: isUuid(editingId) ? editingId : generateUuid(),
      name: trimmedName,
      defaultPrice: priceNum,
      description: formData.description.trim()
    };

    onSaveService(serviceData);
    handleCancelEdit();
  }

  function handleDelete(service) {
    if (window.confirm(`Bạn có chắc chắn muốn xóa gói dịch vụ "${service.name}"?`)) {
      onDeleteService(service.id);
      if (editingId === service.id) {
        handleCancelEdit();
      }
    }
  }

  const filteredServices = services.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl border border-slate-200 max-w-2xl w-full my-4 sm:my-6 max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-100">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Quản Lý Gói Dịch Vụ Nha Khoa</h3>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                Thêm gói và giá niêm yết để chọn nhanh khi tiếp nhận khách hàng
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-6">
          {/* Form Thêm / Sửa Gói */}
          <div className={`p-3.5 sm:p-4 rounded-lg border transition-all ${
            editingId 
              ? 'bg-amber-50/60 border-amber-300 ring-1 ring-amber-300' 
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
                {editingId ? (
                  <>
                    <Pencil className="w-3.5 h-3.5 text-amber-600" />
                    <span>Đang chỉnh sửa gói: #{editingId}</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 text-sky-600" />
                    <span>Thêm gói dịch vụ mới</span>
                  </>
                )}
              </span>
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-[11px] text-slate-500 hover:text-slate-700 underline"
                >
                  Hủy sửa
                </button>
              )}
            </div>

            {error && (
              <div className="mb-3 p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Tên gói dịch vụ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Niềng răng mắc cài kim loại"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 sm:py-1.5 bg-white border border-slate-300 rounded text-base sm:text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Giá niêm yết (VNĐ) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="0"
                      step="1000"
                      placeholder="VD: 15000000"
                      value={formData.defaultPrice}
                      onChange={e => setFormData({ ...formData, defaultPrice: e.target.value })}
                      className="w-full px-3 py-2 sm:py-1.5 bg-white border border-slate-300 rounded text-base sm:text-xs font-semibold focus:ring-1 focus:ring-sky-500 focus:outline-none"
                    />
                  </div>
                  {formData.defaultPrice !== '' && !isNaN(formData.defaultPrice) && (
                    <p className="text-[10px] text-emerald-700 font-medium mt-1">
                      Hiển thị: <strong>{formatVND(Number(formData.defaultPrice))}</strong>
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Mô tả / Ghi chú liệu trình (Tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="VD: Bao gồm bảo hành 5 năm, miễn phí vệ sinh định kỳ..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 sm:py-1.5 bg-white border border-slate-300 rounded text-base sm:text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                {editingId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded transition-colors"
                  >
                    Hủy
                  </button>
                )}
                <button
                  type="submit"
                  className={`px-4 py-1.5 text-xs font-semibold text-white rounded transition-colors shadow-xs inline-flex items-center gap-1.5 ${
                    editingId 
                      ? 'bg-amber-600 hover:bg-amber-700' 
                      : 'bg-sky-600 hover:bg-sky-700'
                  }`}
                >
                  {editingId ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>{editingId ? 'Cập nhật gói' : 'Thêm gói dịch vụ'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Danh sách các gói hiện có */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-800">Danh sách gói dịch vụ</span>
                <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-semibold text-[11px]">
                  {services.length} gói
                </span>
              </div>
              <input
                type="text"
                placeholder="Tìm gói dịch vụ..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full sm:w-48 px-2.5 py-1.5 sm:py-1 text-base sm:text-xs border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 bg-white"
              />
            </div>

            <div className="border border-slate-200 rounded-lg overflow-x-auto bg-white shadow-xs">
              <table className="w-full text-xs text-left min-w-[32rem]">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 whitespace-nowrap">
                  <tr>
                    <th className="py-2.5 px-3">Mã gói</th>
                    <th className="py-2.5 px-4">Tên gói dịch vụ</th>
                    <th className="py-2.5 px-4 text-right">Giá niêm yết</th>
                    <th className="py-2.5 px-4">Mô tả</th>
                    <th className="py-2.5 px-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredServices.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        Chưa có gói dịch vụ nào khớp từ khóa.
                      </td>
                    </tr>
                  ) : (
                    filteredServices.map(service => (
                      <tr 
                        key={service.id} 
                        className={`hover:bg-slate-50/80 transition-colors ${
                          editingId === service.id ? 'bg-amber-50/50' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 font-medium">
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                            {service.id}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-900">
                          {service.name}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-sky-700">
                          {formatVND(service.defaultPrice)}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 text-[11px] max-w-[200px] truncate">
                          {service.description || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => handleStartEdit(service)}
                              title="Sửa gói"
                              className="p-1 rounded text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(service)}
                              title="Xóa gói"
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs">
          <span className="text-slate-500 flex items-center gap-1.5">
            <PackageCheck className="w-4 h-4 text-emerald-600" />
            <span>Các gói trên sẽ xuất hiện ngay trong bảng chọn nhanh cho khách hàng.</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-md transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}


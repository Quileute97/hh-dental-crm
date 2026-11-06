import React, { useState } from 'react';
import { 
  X, 
  User, 
  Phone, 
  Calendar, 
  ShieldCheck, 
  Lock, 
  Tag, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  CreditCard, 
  ArrowRight, 
  Gift, 
  Plus, 
  Activity, 
  FileText, 
  Sparkles,
  ChevronRight,
  Award
} from 'lucide-react';
import { formatVND, formatDate } from '../../utils/formatters';
import { calculateCustomerCredit, getCommissionRatesByCustomerDepth } from '../../services/commissionEngine';

export default function CustomerProfileModal({
  isOpen,
  onClose,
  customer,
  customers = [],
  visits = [],
  partners = [],
  services = [],
  onAddVisit
}) {
  const [showAddVisitForm, setShowAddVisitForm] = useState(false);
  const [visitAmount, setVisitAmount] = useState('');
  const [visitNote, setVisitNote] = useState('');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().substring(0, 10));
  const [visitError, setVisitError] = useState('');

  if (!isOpen || !customer) return null;

  // 1. Đối tác sở hữu (CTV gán cứng)
  const ownerPartner = partners.find(p => p.id === customer.ownerPartnerId);

  // 2. Người giới thiệu (nếu có)
  const parentCustomer = customer.referrerCustomerId 
    ? customers.find(c => c.id === customer.referrerCustomerId)
    : null;

  // 3. Toàn bộ visits của khách hàng
  const custVisits = visits
    .filter(v => v.customerId === customer.id)
    .sort((a, b) => new Date(a.occurredAt || 0) - new Date(b.occurredAt || 0));

  const totalPaid = custVisits.reduce((sum, v) => sum + (v.amount || 0), 0);

  // 4. Gói dịch vụ hiện tại & Tiến độ thanh toán
  const matchedService = services.find(s => s.name === customer.treatment);
  const packagePrice = matchedService ? matchedService.defaultPrice : (custVisits[0]?.amount || totalPaid || 1);
  const remaining = Math.max(0, packagePrice - totalPaid);
  const paymentPercent = packagePrice > 0 ? Math.min(100, Math.round((totalPaid / packagePrice) * 100)) : 100;

  // 5. Tỷ lệ hoa hồng CTV từ khách này theo Plan V5
  const { ctvRate } = getCommissionRatesByCustomerDepth(customer.depth || 1);

  // 6. Credit tích lũy từ việc giới thiệu khách con
  const accumulatedCredit = calculateCustomerCredit(customers, customer.id);
  const referredChildren = customers.filter(c => c.referrerCustomerId === customer.id);

  function handleSaveNewVisit(e) {
    e.preventDefault();
    setVisitError('');

    const num = parseInt(visitAmount, 10);
    if (isNaN(num) || num <= 0) {
      setVisitError('Vui lòng nhập số tiền điều trị hợp lệ lớn hơn 0.');
      return;
    }

    if (onAddVisit) {
      onAddVisit({
        customerId: customer.id,
        amount: num,
        note: visitNote.trim() || 'Tái khám / Đợt điều trị bổ sung',
        occurredAt: new Date(visitDate).toISOString()
      });
    }

    // Reset form
    setVisitAmount('');
    setVisitNote('');
    setShowAddVisitForm(false);
  }

  function handleSelectQuickService(s) {
    setVisitAmount(String(s.defaultPrice));
    setVisitNote(s.name);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl border border-slate-200 max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-100">
        
        {/* ================================================================= */}
        {/* HEADER HỒ SƠ KHÁCH HÀNG */}
        {/* ================================================================= */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
              {customer.name?.charAt(0)?.toUpperCase() || 'K'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-slate-900 text-base">{customer.name}</h2>
                <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded font-semibold">
                  {customer.code || customer.id}
                </span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                  customer.status === 'completed'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : customer.status === 'arrived'
                    ? 'bg-sky-100 text-sky-800 border border-sky-300'
                    : 'bg-slate-100 text-slate-700 border border-slate-300'
                }`}>
                  {customer.status === 'completed' ? 'Đã hoàn tất' : customer.status === 'arrived' ? 'Đã đến khám' : 'Tiềm năng (Lead)'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                <span>Hồ sơ khách hàng H&H Dental</span>
                <span>&bull;</span>
                <span>Ngày tiếp nhận: {formatDate(customer.createdAt)}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/70 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ================================================================= */}
        {/* BODY NỘI DUNG HỒ SƠ */}
        {/* ================================================================= */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* HÀNG 1: THÔNG TIN KHÁCH HÀNG & CTV BẢO TRỢ GÁN CỨNG */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* 1. Thông tin liên hệ & Vị trí chuỗi */}
            <div className="bg-slate-50/70 border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/70">
                <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-sky-600" />
                  <span>Thông Tin Khách Hàng</span>
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-200">
                  Chuỗi khách: Tầng {customer.depth || 1}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Số điện thoại:</span>
                  <span className="font-semibold text-slate-900 font-mono flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    {customer.phone || 'Chưa cập nhật'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Khách giới thiệu (Cha):</span>
                  {parentCustomer ? (
                    <span className="font-semibold text-slate-800">
                      {parentCustomer.name} <span className="text-slate-400 font-mono">({parentCustomer.code})</span>
                    </span>
                  ) : (
                    <span className="text-slate-500 italic">Khách trực tiếp từ CTV (Tầng 1)</span>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Credit dịch vụ tích lũy:</span>
                  {accumulatedCredit > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-amber-800 bg-amber-100 border border-amber-300">
                      <Gift className="w-3 h-3 text-amber-600" />
                      <span>+{formatVND(accumulatedCredit)}</span>
                    </span>
                  ) : (
                    <span className="text-slate-400 font-mono">0 ₫</span>
                  )}
                </div>

                <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1 border-t border-slate-200/50">
                  <span>Khách con đã giới thiệu:</span>
                  <span className="font-semibold text-slate-700">{referredChildren.length} khách</span>
                </div>
              </div>
            </div>

            {/* 2. Cộng tác viên trực thuộc (Gán cứng) */}
            <div className="bg-sky-50/50 border border-sky-200 rounded-lg p-4 space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between pb-2 border-b border-sky-200/70">
                <span className="font-bold text-xs text-sky-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-sky-600" />
                  <span>Cộng Tác Viên Trực Thuộc</span>
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-600 text-white shadow-2xs">
                  <Lock className="w-2.5 h-2.5" />
                  <span>GÁN CỨNG (BẤT BIẾN)</span>
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-sky-800">Đối tác sở hữu:</span>
                  <span className="font-bold text-slate-900 text-xs">
                    {ownerPartner ? ownerPartner.name : 'Chưa chỉ định'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sky-800">Mã đối tác CTV:</span>
                  <span className="font-mono font-semibold text-sky-900 bg-white px-1.5 py-0.5 rounded border border-sky-200">
                    {ownerPartner?.code || customer.ownerPartnerId}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sky-800">Tỷ lệ hoa hồng khách này:</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    CTV {ctvRate}% (Sàn 0% - Hoàn trọn đời)
                  </span>
                </div>

                <div className="text-[10px] text-sky-700 italic pt-1 border-t border-sky-200/50 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-sky-500 shrink-0" />
                  <span>Kế thừa bất biến từ người giới thiệu; không thể thay đổi đối tác bảo trợ.</span>
                </div>
              </div>
            </div>

          </div>

          {/* ================================================================= */}
          {/* HÀNG 2: TIẾN ĐỘ GÓI DỊCH VỤ HIỆN TẠI (KÈM THANH TOÁN) */}
          {/* ================================================================= */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                    Tiến Độ Gói Dịch Vụ & Thanh Toán Hiện Tại
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Theo dõi hạn mức gói, tổng thanh toán và công nợ còn lại
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Gói đăng ký:</span>
                <span className="font-bold text-slate-800 px-2 py-1 bg-slate-100 rounded text-xs border border-slate-200">
                  {customer.treatment || 'Chưa chọn gói'}
                </span>
              </div>
            </div>

            {/* 3 Thẻ thống kê thanh toán */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[11px] text-slate-500 block font-medium">Giá trị gói niêm yết</span>
                <span className="text-base font-bold text-slate-900 mt-0.5 block">
                  {formatVND(packagePrice)}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {matchedService?.description || 'Trọn gói liệu trình chuẩn'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200">
                <span className="text-[11px] text-emerald-700 block font-medium">Đã thanh toán ({paymentPercent}%)</span>
                <span className="text-base font-bold text-emerald-800 mt-0.5 block">
                  {formatVND(totalPaid)}
                </span>
                <span className="text-[10px] text-emerald-600 mt-1 block">
                  Tích lũy qua {custVisits.length} lần điều trị
                </span>
              </div>

              <div className={`p-3 rounded-lg border ${
                remaining === 0 
                  ? 'bg-sky-50/70 border-sky-200 text-sky-800' 
                  : 'bg-amber-50/70 border-amber-200 text-amber-900'
              }`}>
                <span className="text-[11px] block font-medium">
                  {remaining === 0 ? 'Tình trạng công nợ' : 'Còn lại cần thanh toán'}
                </span>
                <span className="text-base font-bold mt-0.5 block">
                  {remaining === 0 ? 'Đã tất toán (0 ₫)' : formatVND(remaining)}
                </span>
                <span className="text-[10px] mt-1 block">
                  {remaining === 0 ? '✅ Hoàn tất 100% nghĩa vụ' : `Cần thu thêm đợt tiếp theo`}
                </span>
              </div>
            </div>

            {/* Thanh tiến độ trực quan */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700">Tiến độ thanh toán gói:</span>
                <span className={`font-bold ${paymentPercent >= 100 ? 'text-emerald-700' : 'text-sky-700'}`}>
                  {paymentPercent}% ({formatVND(totalPaid)} / {formatVND(packagePrice)})
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    paymentPercent >= 100 
                      ? 'bg-emerald-500' 
                      : paymentPercent >= 50 
                      ? 'bg-sky-500' 
                      : 'bg-amber-500'
                  }`}
                  style={{ width: `${paymentPercent}%` }}
                />
              </div>
            </div>

            {/* Tiến độ giai đoạn lâm sàng / điều trị */}
            <div className="grid grid-cols-3 gap-2 pt-2 text-[11px]">
              <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>1. Khám & Lên phác đồ</span>
              </div>
              <div className={`p-2 rounded border flex items-center gap-1.5 font-medium ${
                custVisits.length > 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                {custVisits.length > 0 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
                <span>2. Điều trị ({custVisits.length} lượt)</span>
              </div>
              <div className={`p-2 rounded border flex items-center gap-1.5 font-medium ${
                paymentPercent >= 100 && customer.status === 'completed'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                {paymentPercent >= 100 && customer.status === 'completed' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                )}
                <span>3. Hoàn tất & Chăm sóc</span>
              </div>
            </div>
          </div>

          {/* ================================================================= */}
          {/* HÀNG 3: LỊCH SỬ ĐIỀU TRỊ (TREATMENT VISITS HISTORY) */}
          {/* ================================================================= */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                    Lịch Sử Điều Trị & Nhật Ký Doanh Thu ({custVisits.length} lần)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Toàn bộ các đợt phát sinh điều trị thực tế của khách hàng
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowAddVisitForm(!showAddVisitForm)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-md transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showAddVisitForm ? 'Đóng form thêm' : '+ Thêm đợt điều trị'}</span>
              </button>
            </div>

            {/* Form thêm đợt điều trị nhanh (nếu mở) */}
            {showAddVisitForm && (
              <form onSubmit={handleSaveNewVisit} className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3 text-xs animate-in fade-in duration-150">
                <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-sky-600" />
                  <span>Ghi nhận lần khám / đợt điều trị phát sinh</span>
                </div>

                {visitError && (
                  <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                    {visitError}
                  </div>
                )}

                {/* Chọn nhanh gói */}
                {services.length > 0 && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Chọn nhanh từ gói dịch vụ:
                    </label>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                      {services.map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handleSelectQuickService(s)}
                          className="px-2 py-0.5 rounded bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 text-[10px] text-slate-700 font-medium"
                        >
                          {s.name} ({formatVND(s.defaultPrice)})
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Số tiền đợt này (VNĐ) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1000"
                      step="1000"
                      placeholder="VD: 5000000"
                      value={visitAmount}
                      onChange={e => setVisitAmount(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-bold text-xs bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                    {visitAmount && !isNaN(visitAmount) && (
                      <span className="text-[10px] text-emerald-700 font-medium block mt-0.5">
                        {formatVND(Number(visitAmount))}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nội dung điều trị</label>
                    <input
                      type="text"
                      placeholder="VD: Tái khám định kỳ, gắn mắc cài..."
                      value={visitNote}
                      onChange={e => setVisitNote(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Ngày thực hiện</label>
                    <input
                      type="date"
                      value={visitDate}
                      onChange={e => setVisitDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddVisitForm(false)}
                    className="px-3 py-1 font-semibold text-slate-600 hover:bg-slate-200 rounded"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded shadow-xs"
                  >
                    Lưu đợt điều trị
                  </button>
                </div>
              </form>
            )}

            {/* Bảng danh sách lượt khám */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 text-center w-12">#</th>
                    <th className="py-2.5 px-4">Nội dung điều trị / Hạng mục</th>
                    <th className="py-2.5 px-4 text-center">Ngày điều trị</th>
                    <th className="py-2.5 px-4 text-right">Số tiền thanh toán</th>
                    <th className="py-2.5 px-3 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {custVisits.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400">
                        Chưa có lượt điều trị nào được ghi nhận cho khách hàng này.
                      </td>
                    </tr>
                  ) : (
                    custVisits.map((v, index) => (
                      <tr key={v.id || index} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-400">
                          {index + 1}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-900">
                          <div>{v.note || (index === 0 ? 'Gói điều trị ban đầu' : 'Tái điều trị')}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{v.id}</div>
                        </td>
                        <td className="py-2.5 px-4 text-center text-slate-600 text-[11px]">
                          {formatDate(v.occurredAt)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-emerald-700">
                          {formatVND(v.amount)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Đã thu</span>
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {custVisits.length > 0 && (
                  <tfoot className="bg-slate-50 font-bold border-t border-slate-200 text-slate-900">
                    <tr>
                      <td colSpan={3} className="py-2.5 px-4 text-right">
                        Tổng cộng doanh thu tích lũy:
                      </td>
                      <td className="py-2.5 px-4 text-right text-emerald-800 text-sm">
                        {formatVND(totalPaid)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

          </div>

        </div>

        {/* ================================================================= */}
        {/* FOOTER HỒ SƠ */}
        {/* ================================================================= */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs">
          <span className="text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-sky-600" />
            <span>Hồ sơ chuẩn hóa theo Kiến Trúc Hai Trục & Chuỗi Khách V5 — H&H Dental</span>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-1.5 font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-md transition-colors shadow-2xs"
          >
            Đóng hồ sơ
          </button>
        </div>

      </div>
    </div>
  );
}


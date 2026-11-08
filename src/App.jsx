import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import StatCards from './components/Dashboard/StatCards';
import RecentReferrals from './components/Dashboard/RecentReferrals';
import TopPartners from './components/Dashboard/TopPartners';
import PartnerModal from './components/Partners/PartnerModal';
import CustomerModal from './components/Customers/CustomerModal';
import AddVisitModal from './components/Customers/AddVisitModal';
import CustomerProfileModal from './components/Customers/CustomerProfileModal';
import AuditLogModal from './components/Audit/AuditLogModal';
import ServicePackageModal from './components/Services/ServicePackageModal';
import LoginScreen from './components/Auth/LoginScreen';

// Code-split các Tab view lớn bằng React.lazy
const PartnerTree = React.lazy(() => import('./components/Partners/PartnerTree'));
const PartnerList = React.lazy(() => import('./components/Partners/PartnerList'));
const CustomerList = React.lazy(() => import('./components/Customers/CustomerList'));
const SettlementView = React.lazy(() => import('./components/Commissions/SettlementView'));
const ReportsView = React.lazy(() => import('./components/Reports/ReportsView'));
const AccountsView = React.lazy(() => import('./components/Accounts/AccountsView'));
import RequirePermission from './components/Common/RequirePermission';
import { can } from './config/permissions';

import {
  fetchAllData,
  apiSavePartner,
  apiTogglePartnerStatus,
  apiSaveCustomer,
  apiAddVisit,
  apiSaveService,
  apiDeleteService,
  apiSaveSettlement,
  apiResetData,
  apiFetchAuditLogs,
  apiComputeMonth
} from './services/api';
import { calculateMonthlySettlement, COMMISSION_POLICY } from './services/commissionEngine';
import { useAuth } from './context/AuthContext';
import { formatVND } from './utils/formatters';
import { CheckCircle2, Network, List, Info, AlertTriangle, AlertCircle, ArrowLeft } from 'lucide-react';

export default function App() {
  const { user, loading: authLoading, role, partnerId, isAdmin, isAccountant, isFrontdesk, isPartner } = useAuth();

  const [data, setData] = useState({
    partners: [],
    services: [],
    customers: [],
    visits: [],
    settlements: [],
  });

  const [isServerOnline, setIsServerOnline] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [partnerViewMode, setPartnerViewMode] = useState('tree');

  // Chọn kỳ đối soát (mặc định '2026-11' khớp tập dữ liệu chuẩn 172.000.000 VNĐ)
  const [selectedMonth, setSelectedMonth] = useState('2026-11');

  // Kết quả tính toán từ Supabase Postgres RPC (compute_month)
  const [rpcRows, setRpcRows] = useState(null);
  // Trạng thái nếu RPC bị từ chối quyền (ví dụ frontdesk)
  const [isRpcForbidden, setIsRpcForbidden] = useState(false);

  // Modals
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [partnerModalOpen, setPartnerModalOpen] = useState(false);
  const [partnerToEdit, setPartnerToEdit] = useState(null);
  const [defaultParentId, setDefaultParentId] = useState(null);

  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerProfileModalOpen, setCustomerProfileModalOpen] = useState(false);
  const [selectedCustomerForProfile, setSelectedCustomerForProfile] = useState(null);
  const [servicePackageModalOpen, setServicePackageModalOpen] = useState(false);

  // Modal "+ Doanh thu" cho khách hàng
  const [addVisitModalOpen, setAddVisitModalOpen] = useState(false);
  const [targetCustomerForVisit, setTargetCustomerForVisit] = useState(null);
  const [targetCustomerTotalRevenue, setTargetCustomerTotalRevenue] = useState(0);

  // Audit log modal
  const [auditLogModalOpen, setAuditLogModalOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);

  // Toast notification
  const [toastMessage, setToastMessage] = useState(null);
  const [loadError, setLoadError] = useState(null);

  // Khởi tạo và nạp dữ liệu từ Backend Supabase Postgres khi có phiên đăng nhập
  async function loadData() {
    if (!user) return;
    setLoadError(null);
    try {
      const res = await fetchAllData();
      if (!res.data && import.meta.env.PROD) {
        setLoadError(res.error || 'Không thể kết nối với máy chủ Supabase. Vui lòng kiểm tra lại cấu hình.');
        setIsServerOnline(false);
      } else {
        setData(res.data || { partners: [], services: [], customers: [], visits: [], settlements: [] });
        setIsServerOnline(res.isServer);
      }
    } catch (err) {
      if (import.meta.env.PROD) {
        setLoadError(err.message || 'Lỗi kết nối máy chủ Supabase.');
        setIsServerOnline(false);
      }
    }
  }

  useEffect(() => {
    loadData();
  }, [user]);

  // Gọi Postgres RPC compute_month trên Supabase khi thay đổi tháng hoặc dữ liệu
  useEffect(() => {
    let cancelled = false;
    async function loadRpcCompute() {
      if (!user) return;
      const res = await apiComputeMonth(selectedMonth);
      if (cancelled) return;
      if (res.reason === 'forbidden') {
        setIsRpcForbidden(true);
        setRpcRows(null);
        return;
      }
      setIsRpcForbidden(false);
      if (res.ok && res.rows && res.rows.length > 0) {
        setRpcRows(res.rows);
      } else {
        setRpcRows(null);
      }
    }
    loadRpcCompute();
    return () => { cancelled = true; };
  }, [selectedMonth, data, user]);

  // Kiểm tra phân quyền chuyển Tab theo Ma trận can(role, ...)
  const allowedTabs = useMemo(() => {
    const list = ['dashboard', 'customers'];
    if (can(role, 'viewOtherPartners')) list.push('partners');
    if (can(role, 'settleMonth')) list.push('commissions');
    if (can(role, 'viewSystemRevenue')) list.push('reports');
    if (can(role, 'manageAccounts')) list.push('accounts');
    return list;
  }, [role]);

  useEffect(() => {
    if (allowedTabs.length > 0 && !allowedTabs.includes(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [role, allowedTabs]);

  function showToast(message, type = 'success') {
    setToastMessage({ message, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }

  // --------------------------------------------------------------------------
  // TÍNH TOÁN THEO KỲ THÁNG (POSTGRES RPC + ENGINE FALLBACK)
  // An toàn tuyệt đối, không bao giờ đọc trường undefined gây crash app
  // --------------------------------------------------------------------------
  const settlementResult = useMemo(() => {
    const local = calculateMonthlySettlement(selectedMonth, {
      partners: data.partners || [],
      customers: data.customers || [],
      visits: data.visits || [],
      settlements: data.settlements || []
    }) || {
      month: selectedMonth,
      periodRevenue: 0,
      totalCtvCommission: 0,
      totalPlatformShare: 0,
      totalBranchFee: 0,
      totalCost: 0,
      costPercent: 0,
      totalCredit: 0,
      visitBreakdowns: [],
      partnerRows: [],
      settlementCount: 0,
      isFullySettled: false
    };

    if (!rpcRows || rpcRows.length === 0) {
      const pRev = local.periodRevenue || 0;
      const comm = local.totalCtvCommission || 0;
      const fee = local.totalBranchFee || 0;
      return {
        ...local,
        summary: {
          totalRevenue: pRev,
          totalCommission: comm,
          totalBranchFee: fee,
          systemNetRevenue: pRev - (comm + fee),
          systemCostRatio: local.costPercent || 0
        }
      };
    }

    // Kết hợp số liệu trực tiếp từ Postgres RPC compute_month
    const rpcMap = new Map(rpcRows.map(r => [r.partnerId, r]));
    const updatedPartnerRows = (local.partnerRows || []).map(row => {
      const rpc = rpcMap.get(row.partnerId);
      if (!rpc) return row;
      return {
        ...row,
        ownRevenue: rpc.ownRevenue,
        branchRevenue: rpc.branchRevenue,
        commission: rpc.commission,
        branchFee: rpc.branchFee,
        total: rpc.total
      };
    });

    const totalRevenue = updatedPartnerRows.reduce((sum, r) => sum + r.ownRevenue, 0);
    const totalCommission = updatedPartnerRows.reduce((sum, r) => sum + r.commission, 0);
    const totalBranchFee = updatedPartnerRows.reduce((sum, r) => sum + r.branchFee, 0);
    const totalPlatformShare = local.totalPlatformShare || 0;
    const totalCost = totalCommission + totalPlatformShare + totalBranchFee;
    const periodRevenue = totalRevenue || local.periodRevenue || 0;
    const costPercent = periodRevenue > 0
      ? Math.round((totalCost / periodRevenue) * 1000) / 10
      : 0;

    return {
      ...local,
      partnerRows: updatedPartnerRows,
      periodRevenue,
      totalCtvCommission: totalCommission,
      totalPlatformShare,
      totalBranchFee,
      totalCost,
      costPercent,
      summary: {
        totalRevenue: periodRevenue,
        totalCommission,
        totalBranchFee,
        systemNetRevenue: periodRevenue - (totalCommission + totalBranchFee),
        systemCostRatio: costPercent
      }
    };
  }, [selectedMonth, data, rpcRows]);

  // --------------------------------------------------------------------------
  // PHÂN QUYỀN VIEW: LỌC CÂY VÀ KHÁCH THEO ROLE PARTNER
  // Đối tác chỉ xem dữ liệu sổ khách & hoa hồng của chính mình, không lộ số toàn phòng khám
  // --------------------------------------------------------------------------
  const currentPartner = useMemo(() => {
    if (!isPartner) return null;
    return (data.partners || []).find(p => 
      (partnerId && (p.id === partnerId || p.code === partnerId)) ||
      (!partnerId && (p.id === 'P1' || p.code === 'REF-A-FOUNDER'))
    ) || null;
  }, [data.partners, isPartner, partnerId]);

  const displayedPartners = useMemo(() => {
    if (!isPartner) return data.partners;
    if (!currentPartner) return [];
    return [currentPartner];
  }, [data.partners, isPartner, currentPartner]);

  const displayedCustomers = useMemo(() => {
    if (!isPartner) return data.customers;
    const allowedPartnerIds = new Set(displayedPartners.map(p => p.id));
    return (data.customers || []).filter(c => allowedPartnerIds.has(c.ownerPartnerId));
  }, [data.customers, displayedPartners, isPartner]);

  const displayedSettlementResult = useMemo(() => {
    if (!isPartner) return settlementResult;

    // Tìm dòng tính toán của đối tác hiện tại
    const partnerRow = (settlementResult.partnerRows || []).find(
      r => (currentPartner && (r.partnerId === currentPartner.id || r.partnerCode === currentPartner.code)) ||
           (partnerId && (r.partnerId === partnerId || r.partnerCode === partnerId)) ||
           r.partnerId === 'P1'
    );

    if (!partnerRow) {
      return {
        ...settlementResult,
        periodRevenue: 0,
        totalCtvCommission: 0,
        totalPlatformShare: 0,
        totalBranchFee: 0,
        totalCost: 0,
        costPercent: 0,
        partnerRows: [],
        visitBreakdowns: [],
        summary: {
          totalRevenue: 0,
          totalCommission: 0,
          totalBranchFee: 0,
          systemNetRevenue: 0,
          systemCostRatio: 0
        }
      };
    }

    const pRev = partnerRow.ownRevenue || 0;
    const comm = partnerRow.commission || 0;
    const fee = partnerRow.branchFee || 0;
    const total = partnerRow.total || (comm + fee);
    const costRatio = pRev > 0 ? Math.round((total / pRev) * 1000) / 10 : 0;

    const allowedCustIds = new Set((displayedCustomers || []).map(c => c.id));
    const filteredVisits = (settlementResult.visitBreakdowns || []).filter(v =>
      allowedCustIds.has(v.customerId) || (currentPartner && v.ownerPartnerId === currentPartner.id)
    );

    return {
      ...settlementResult,
      periodRevenue: pRev,
      totalCtvCommission: comm,
      totalPlatformShare: 0,
      totalBranchFee: fee,
      totalCost: total,
      costPercent: costRatio,
      partnerRows: [partnerRow],
      visitBreakdowns: filteredVisits,
      summary: {
        totalRevenue: pRev,
        totalCommission: comm,
        totalBranchFee: fee,
        systemNetRevenue: 0,
        systemCostRatio: costRatio
      }
    };
  }, [settlementResult, isPartner, partnerId, currentPartner, displayedCustomers]);

  // --------------------------------------------------------------------------
  // HANDLERS: ĐỐI TÁC (PARTNERS)
  // --------------------------------------------------------------------------
  function handleOpenNewPartner(parentId = null) {
    setPartnerToEdit(null);
    setDefaultParentId(parentId);
    setPartnerModalOpen(true);
  }

  function handleEditPartner(partner) {
    setPartnerToEdit(partner);
    setDefaultParentId(partner.parentId);
    setPartnerModalOpen(true);
  }

  async function handleSavePartner(savedPartner) {
    setData(prev => {
      const exists = prev.partners.some(p => p.id === savedPartner.id);
      let updated;
      if (exists) {
        updated = prev.partners.map(p => p.id === savedPartner.id ? { ...p, ...savedPartner } : p);
      } else {
        updated = [...prev.partners, savedPartner];
      }
      return { ...prev, partners: updated };
    });

    await apiSavePartner(savedPartner);
    showToast(`Đã lưu đối tác ${savedPartner.name} thành công!`);
  }

  async function handleTogglePartnerStatus(partnerId) {
    setData(prev => ({
      ...prev,
      partners: prev.partners.map(p =>
        p.id === partnerId
          ? { ...p, status: p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }
          : p
      )
    }));

    await apiTogglePartnerStatus(partnerId);
  }

  // --------------------------------------------------------------------------
  // HANDLERS: KHÁCH HÀNG (CUSTOMERS) & DOANH THU (VISITS)
  // --------------------------------------------------------------------------
  async function handleSaveCustomer(newCust, initialVisit = null) {
    setData(prev => ({
      ...prev,
      customers: [newCust, ...prev.customers],
      visits: initialVisit ? [initialVisit, ...prev.visits] : prev.visits
    }));

    await apiSaveCustomer(newCust, initialVisit);
    showToast(`Đã tiếp nhận khách hàng ${newCust.name} (Tầng ${newCust.depth})!`);
  }

  function handleViewCustomerProfile(customer) {
    setSelectedCustomerForProfile(customer);
    setCustomerProfileModalOpen(true);
  }

  function handleOpenAddVisit(customer, currentTotalRevenue) {
    setTargetCustomerForVisit(customer);
    setTargetCustomerTotalRevenue(currentTotalRevenue);
    setAddVisitModalOpen(true);
  }

  async function handleSaveVisit(newVisit) {
    setData(prev => ({
      ...prev,
      visits: [newVisit, ...prev.visits]
    }));

    await apiAddVisit(newVisit);
    showToast(`Đã ghi nhận thêm doanh thu ${formatVND(newVisit.amount)} cho khách!`);
  }

  // --------------------------------------------------------------------------
  // HANDLERS: GÓI DỊCH VỤ (SERVICE PACKAGES)
  // --------------------------------------------------------------------------
  async function handleSaveService(service) {
    setData(prev => {
      const exists = prev.services.some(s => s.id === service.id);
      let updated;
      if (exists) {
        updated = prev.services.map(s => s.id === service.id ? { ...s, ...service } : s);
      } else {
        updated = [...prev.services, service];
      }
      return { ...prev, services: updated };
    });

    await apiSaveService(service);
    showToast(`Đã lưu gói dịch vụ "${service.name}" (${formatVND(service.defaultPrice)})!`);
  }

  async function handleDeleteService(serviceId) {
    const deletedService = data.services.find(s => s.id === serviceId);
    setData(prev => ({
      ...prev,
      services: prev.services.filter(s => s.id !== serviceId)
    }));

    await apiDeleteService(serviceId);
    showToast(`Đã xóa gói dịch vụ "${deletedService?.name || serviceId}"!`);
  }

  // --------------------------------------------------------------------------
  // HANDLERS: QUYẾT TOÁN & CHỐT SỔ THÁNG (SUPABASE RPC: settle_month)
  // --------------------------------------------------------------------------
  async function handleConfirmSettlement(month, force = false) {
    const res = await apiSaveSettlement(month, force);
    if (!res.ok) {
      if (res.reason === 'forbidden') {
        showToast('Bạn không có quyền chốt sổ kỳ này.', 'error');
        return;
      }
      if (res.status === 409 && res.requiresConfirm) {
        if (window.confirm('Kỳ này đã chốt sổ trước đó. Chốt lại sẽ tính toán lại từ đầu và ghi đè số cũ?')) {
          return handleConfirmSettlement(month, true);
        }
        return;
      }
      showToast(res.error || 'Có lỗi xảy ra khi chốt sổ.', 'error');
      return;
    }

    if (res.data && Array.isArray(res.data.settlements)) {
      setData(prev => ({
        ...prev,
        settlements: [
          ...prev.settlements.filter(s => s.month !== month),
          ...res.data.settlements
        ]
      }));
    }

    showToast(`Đã chốt sổ thành công kỳ ${month} trên Postgres!`);
  }

  // --------------------------------------------------------------------------
  // HANDLERS: RESET DỮ LIỆU & AUDIT LOGS
  // --------------------------------------------------------------------------
  async function handleResetData() {
    if (window.confirm('Khôi phục lại dữ liệu mẫu chuẩn Plan V5 (172.000.000 VNĐ)? Mọi dữ liệu thử nghiệm sẽ được đưa về mặc định.')) {
      const defaultState = await apiResetData();
      setData(defaultState);
      showToast('Đã khôi phục dữ liệu mẫu Plan V5 thành công!');
    }
  }

  async function handleOpenAuditLogs() {
    const logs = await apiFetchAuditLogs();
    setAuditLogs(logs);
    setAuditLogModalOpen(true);
  }

  // --------------------------------------------------------------------------
  // GIAO DIỆN CHỜ ĐĂNG NHẬP / CHẶN NGƯỜI LẠ TRUY CẬP TRỰC TIẾP
  // --------------------------------------------------------------------------
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-500 font-medium">Đang khởi tạo HH Dental CRM...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLoginSuccess={() => { }} />;
  }

  // Chặn dữ liệu giả trên Production khi không kết nối được máy chủ
  if (import.meta.env.PROD && loadError) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-rose-200 p-6 text-center shadow-lg space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-base">Không thể kết nối máy chủ Supabase</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            {loadError}
          </p>
          <p className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
            Cảnh báo: Hệ thống đã chặn nạp dữ liệu mẫu trên môi trường Production để bảo đảm an toàn số liệu.
          </p>
          <button
            onClick={loadData}
            className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-xs"
          >
            Thử lại kết nối
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-800">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        settlementStatus={displayedSettlementResult}
        onResetData={handleResetData}
        onOpenAuditLogs={handleOpenAuditLogs}
        onOpenLogin={() => setLoginModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Banner cảnh báo Offline / Dữ liệu mẫu */}
        {!isServerOnline && (
          import.meta.env.PROD ? (
            <div className="bg-rose-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shrink-0 shadow-xs">
              <span>🚨 CẢNH BÁO: Mất kết nối máy chủ Supabase — Dữ liệu hiển thị có thể không chính xác!</span>
              <button onClick={loadData} className="underline text-white font-normal hover:text-slate-100 text-xs">
                Thử lại
              </button>
            </div>
          ) : (
            <div className="bg-amber-100 text-amber-900 border-b border-amber-300 px-4 py-2 text-xs font-semibold flex items-center justify-between shrink-0">
              <span>⚠️ DỮ LIỆU MẪU (dev) — Đang sử dụng seed cục bộ, chưa kết nối được máy chủ Supabase</span>
              <button onClick={loadData} className="underline text-amber-900 font-normal hover:text-amber-950 text-xs">
                Thử lại
              </button>
            </div>
          )
        )}

        {/* Top Header with Month Selector */}
        <Header
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          onOpenNewCustomer={() => setCustomerModalOpen(true)}
          onOpenNewPartner={() => handleOpenNewPartner()}
          onOpenServicePackages={() => setServicePackageModalOpen(true)}
          isServerOnline={isServerOnline}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Banner thông báo chế độ offline khi bị từ chối quyền RPC */}
          {isRpcForbidden && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-3.5 py-2.5 rounded-lg text-xs flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Đang tính offline — không có quyền truy vấn server</span>
            </div>
          )}

          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* 4 Chỉ số: Doanh thu kỳ · Hoa hồng CTV · Phần nền tảng · Phí nhánh 1% */}
              <StatCards 
                settlementResult={displayedSettlementResult} 
                customers={displayedCustomers}
                visits={data.visits}
              />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className={can(role, 'viewOtherPartners') ? "lg:col-span-2" : "lg:col-span-3"}>
                  <RecentReferrals
                    settlementResult={displayedSettlementResult}
                    onNavigateTab={setActiveTab}
                    onViewCustomerProfile={handleViewCustomerProfile}
                    customers={displayedCustomers}
                  />
                </div>
                {can(role, 'viewOtherPartners') && (
                  <div className="lg:col-span-1">
                    <TopPartners
                      settlementResult={displayedSettlementResult}
                      onNavigateTab={setActiveTab}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          <Suspense fallback={<div className="p-8 text-center text-slate-400 text-xs">Đang nạp dữ liệu phân hệ...</div>}>
            {/* TAB 2: ĐỐI TÁC (PARTNERS) */}
            {activeTab === 'partners' && (
              <RequirePermission role={role} action="viewOtherPartners" onBack={() => setActiveTab('dashboard')}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Cây Đối Tác & Phí Nhánh 1% (Kỳ {selectedMonth})
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Mạng lưới đối tác không giới hạn độ sâu — Phí nhánh 1% tính trên toàn bộ cây con trực tiếp
                      </p>
                    </div>

                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md p-1 text-xs">
                      <button
                        onClick={() => setPartnerViewMode('tree')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${partnerViewMode === 'tree'
                            ? 'bg-sky-50 text-sky-700 font-semibold'
                            : 'text-slate-600 hover:text-slate-900'
                          }`}
                      >
                        <Network className="w-3.5 h-3.5" />
                        <span>Dạng Cây (Tree)</span>
                      </button>
                      <button
                        onClick={() => setPartnerViewMode('list')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${partnerViewMode === 'list'
                            ? 'bg-sky-50 text-sky-700 font-semibold'
                            : 'text-slate-600 hover:text-slate-900'
                          }`}
                      >
                        <List className="w-3.5 h-3.5" />
                        <span>Dạng Bảng (List)</span>
                      </button>
                    </div>
                  </div>

                  {partnerViewMode === 'tree' ? (
                    <PartnerTree
                      partners={displayedPartners}
                      settlementResult={displayedSettlementResult}
                      onAddPartner={handleOpenNewPartner}
                      onSelectPartner={handleEditPartner}
                    />
                  ) : (
                    <PartnerList
                      partners={displayedPartners}
                      settlementResult={displayedSettlementResult}
                      onAddPartner={handleOpenNewPartner}
                      onEditPartner={handleEditPartner}
                      onToggleStatus={handleTogglePartnerStatus}
                    />
                  )}
                </div>
              </RequirePermission>
            )}

            {/* TAB 3: KHÁCH HÀNG (CUSTOMERS) */}
            {activeTab === 'customers' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Chuỗi Khách Hàng & Doanh Thu Trọn Đời</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Hoa hồng tính theo độ sâu của khách (T1: {COMMISSION_POLICY.depth1}%, T2+: {COMMISSION_POLICY.depth2Plus}%) &bull; Phí nhánh {COMMISSION_POLICY.branchFee}% &bull; Ghi nhận nhiều lần tái khám
                  </p>
                </div>

                <CustomerList
                  customers={displayedCustomers}
                  visits={data.visits}
                  partners={displayedPartners}
                  onNewCustomer={() => setCustomerModalOpen(true)}
                  onOpenAddVisit={handleOpenAddVisit}
                  onViewCustomerProfile={handleViewCustomerProfile}
                />
              </div>
            )}

            {/* TAB 4: QUYẾT TOÁN (SETTLEMENTS) */}
            {activeTab === 'commissions' && (
              <RequirePermission role={role} action="settleMonth" onBack={() => setActiveTab('dashboard')}>
                <div className="space-y-4">
                  <SettlementView
                    month={selectedMonth}
                    settlementResult={displayedSettlementResult}
                    onConfirmSettlement={handleConfirmSettlement}
                  />
                </div>
              </RequirePermission>
            )}

            {/* TAB 5: BÁO CÁO (REPORTS) */}
            {activeTab === 'reports' && (
              <RequirePermission role={role} action="viewSystemRevenue" onBack={() => setActiveTab('dashboard')}>
                <div className="space-y-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Báo Cáo Đối Soát & Xuất CSV (BOM UTF-8)</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Tải bảng đối soát kế toán và danh sách khách hàng mở trực tiếp trên Excel không lỗi font tiếng Việt
                    </p>
                  </div>

                  <ReportsView
                    month={selectedMonth}
                    customers={data.customers}
                    visits={data.visits}
                    partners={data.partners}
                    settlementResult={settlementResult}
                  />
                </div>
              </RequirePermission>
            )}

            {/* TAB 6: TÀI KHOẢN & PHÂN QUYỀN (ACCOUNTS - ADMIN) */}
            {activeTab === 'accounts' && (
              <RequirePermission role={role} action="manageAccounts" onBack={() => setActiveTab('dashboard')}>
                <AccountsView partners={data.partners} showToast={showToast} />
              </RequirePermission>
            )}

            {/* SOFT 404: KHÔNG TÌM THẤY TRANG */}
            {!['dashboard', 'partners', 'customers', 'commissions', 'reports', 'accounts'].includes(activeTab) && (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-4">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">Không tìm thấy trang</h3>
                <p className="text-xs text-slate-500 mb-6 max-w-sm">
                  Đường dẫn hoặc phân hệ bạn yêu cầu không tồn tại hoặc tài khoản không được phân quyền truy cập.
                </p>
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Quay lại Bảng điều khiển
                </button>
              </div>
            )}
          </Suspense>
        </main>
      </div>

      {/* MODALS */}
      {loginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <LoginScreen
            isModal={true}
            onClose={() => setLoginModalOpen(false)}
            onLoginSuccess={() => setLoginModalOpen(false)}
          />
        </div>
      )}

      <PartnerModal
        isOpen={partnerModalOpen}
        onClose={() => setPartnerModalOpen(false)}
        onSave={handleSavePartner}
        partnerToEdit={partnerToEdit}
        partners={data.partners}
        defaultParentId={defaultParentId}
      />

      <CustomerModal
        isOpen={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        onSaveCustomer={handleSaveCustomer}
        partners={data.partners}
        customers={data.customers}
        services={data.services}
        onOpenManageServices={() => setServicePackageModalOpen(true)}
      />

      <CustomerProfileModal
        isOpen={customerProfileModalOpen}
        onClose={() => setCustomerProfileModalOpen(false)}
        customer={selectedCustomerForProfile}
        customers={data.customers}
        visits={data.visits}
        partners={data.partners}
        services={data.services}
        onAddVisit={handleSaveVisit}
      />

      <AddVisitModal
        isOpen={addVisitModalOpen}
        onClose={() => setAddVisitModalOpen(false)}
        customer={targetCustomerForVisit}
        currentTotalRevenue={targetCustomerTotalRevenue}
        onSaveVisit={handleSaveVisit}
        services={data.services}
      />

      <ServicePackageModal
        isOpen={servicePackageModalOpen}
        onClose={() => setServicePackageModalOpen(false)}
        services={data.services}
        onSaveService={handleSaveService}
        onDeleteService={handleDeleteService}
      />

      <AuditLogModal
        isOpen={auditLogModalOpen}
        onClose={() => setAuditLogModalOpen(false)}
        logs={auditLogs}
        currentUserRole={currentUserRole}
      />

      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 bg-slate-900 text-white text-xs rounded-lg shadow-lg animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage.message}</span>
        </div>
      )}
    </div>
  );
}

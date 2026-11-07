import React, { useState, useEffect, useMemo } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import StatCards from './components/Dashboard/StatCards';
import RecentReferrals from './components/Dashboard/RecentReferrals';
import TopPartners from './components/Dashboard/TopPartners';
import PartnerTree from './components/Partners/PartnerTree';
import PartnerList from './components/Partners/PartnerList';
import PartnerModal from './components/Partners/PartnerModal';
import CustomerList from './components/Customers/CustomerList';
import CustomerModal from './components/Customers/CustomerModal';
import AddVisitModal from './components/Customers/AddVisitModal';
import CustomerProfileModal from './components/Customers/CustomerProfileModal';
import SettlementView from './components/Commissions/SettlementView';
import ReportsView from './components/Reports/ReportsView';
import AuditLogModal from './components/Audit/AuditLogModal';
import ServicePackageModal from './components/Services/ServicePackageModal';
import LoginScreen from './components/Auth/LoginScreen';

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
import { calculateMonthlySettlement } from './services/commissionEngine';
import { useAuth } from './context/AuthContext';
import { formatVND } from './utils/formatters';
import { CheckCircle2, Network, List } from 'lucide-react';

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

  // Khởi tạo và nạp dữ liệu từ Backend Supabase Postgres khi có phiên đăng nhập
  useEffect(() => {
    let active = true;
    async function loadData() {
      if (!user) return;
      const { data: initialData, isServer } = await fetchAllData();
      if (active) {
        setData(initialData);
        setIsServerOnline(isServer);
      }
    }
    loadData();
    return () => { active = false; };
  }, [user]);

  // Gọi Postgres RPC compute_month trên Supabase khi thay đổi tháng hoặc dữ liệu
  useEffect(() => {
    let cancelled = false;
    async function loadRpcCompute() {
      if (!user) return;
      const res = await apiComputeMonth(selectedMonth);
      if (!cancelled && res.ok && res.rows && res.rows.length > 0) {
        setRpcRows(res.rows);
      }
    }
    loadRpcCompute();
    return () => { cancelled = true; };
  }, [selectedMonth, data, user]);

  // Kiểm tra phân quyền chuyển Tab
  useEffect(() => {
    const rolePermissions = {
      admin: ['dashboard', 'partners', 'customers', 'commissions', 'reports'],
      accountant: ['dashboard', 'partners', 'customers', 'commissions', 'reports'],
      frontdesk: ['dashboard', 'partners', 'customers'],
      partner: ['dashboard', 'customers', 'commissions']
    };
    const allowed = rolePermissions[role] || rolePermissions.admin;
    if (!allowed.includes(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [role, activeTab]);

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
  // --------------------------------------------------------------------------
  const displayedPartners = useMemo(() => {
    if (!isPartner || !partnerId) return data.partners;
    const subtree = new Set([partnerId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const p of data.partners) {
        if (p.parentId && subtree.has(p.parentId) && !subtree.has(p.id)) {
          subtree.add(p.id);
          changed = true;
        }
      }
    }
    return data.partners.filter(p => subtree.has(p.id));
  }, [data.partners, isPartner, partnerId]);

  const displayedCustomers = useMemo(() => {
    if (!isPartner || !partnerId) return data.customers;
    const allowedPartnerIds = new Set(displayedPartners.map(p => p.id));
    return data.customers.filter(c => allowedPartnerIds.has(c.ownerPartnerId));
  }, [data.customers, displayedPartners, isPartner, partnerId]);

  const displayedSettlementResult = useMemo(() => {
    if (!isPartner || !partnerId) return settlementResult;
    const allowedPartnerIds = new Set(displayedPartners.map(p => p.id));
    return {
      ...settlementResult,
      partnerRows: (settlementResult.partnerRows || []).filter(r => allowedPartnerIds.has(r.partnerId))
    };
  }, [settlementResult, displayedPartners, isPartner, partnerId]);

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
    return <LoginScreen onLoginSuccess={() => {}} />;
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
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* 4 Chỉ số: Doanh thu kỳ · Hoa hồng CTV · Phần nền tảng · Phí nhánh 1% */}
              <StatCards settlementResult={displayedSettlementResult} />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <RecentReferrals
                    settlementResult={displayedSettlementResult}
                    onNavigateTab={setActiveTab}
                    onViewCustomerProfile={handleViewCustomerProfile}
                    customers={displayedCustomers}
                  />
                </div>
                <div className="lg:col-span-1">
                  <TopPartners
                    settlementResult={displayedSettlementResult}
                    onNavigateTab={setActiveTab}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ĐỐI TÁC (PARTNERS) */}
          {activeTab === 'partners' && (
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
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
                      partnerViewMode === 'tree'
                        ? 'bg-sky-50 text-sky-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Network className="w-3.5 h-3.5" />
                    <span>Dạng Cây (Tree)</span>
                  </button>
                  <button
                    onClick={() => setPartnerViewMode('list')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded transition-colors ${
                      partnerViewMode === 'list'
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
          )}

          {/* TAB 3: KHÁCH HÀNG (CUSTOMERS) */}
          {activeTab === 'customers' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Chuỗi Khách Hàng & Doanh Thu Trọn Đời</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Hoa hồng tính theo độ sâu của khách (T1: 20%, T2: 2%+8%, T3+: 2%+3%) &bull; Ghi nhận nhiều lần tái khám
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
            <div className="space-y-4">
              <SettlementView
                month={selectedMonth}
                settlementResult={displayedSettlementResult}
                onConfirmSettlement={handleConfirmSettlement}
              />
            </div>
          )}

          {/* TAB 5: BÁO CÁO (REPORTS) */}
          {activeTab === 'reports' && (
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
          )}
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

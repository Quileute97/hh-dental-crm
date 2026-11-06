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

import { 
  fetchAllData, 
  syncSaveData, 
  apiSavePartner, 
  apiTogglePartnerStatus, 
  apiSaveCustomer,
  apiAddVisit,
  apiSaveService,
  apiDeleteService,
  apiSaveSettlement,
  apiResetData, 
  apiFetchAuditLogs 
} from './services/api';
import { calculateMonthlySettlement } from './services/commissionEngine';
import { formatVND } from './utils/formatters';
import { CheckCircle2, Network, List } from 'lucide-react';

export default function App() {
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

  // 3.1 Chọn kỳ đối soát (mặc định '2026-11' khớp tập dữ liệu mẫu và thời điểm hiện tại)
  const [selectedMonth, setSelectedMonth] = useState('2026-11');

  // Modals
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

  // Khởi tạo và nạp dữ liệu từ Backend Server / Local fallback
  useEffect(() => {
    async function loadInitial() {
      const { data: initialData, isServer } = await fetchAllData();
      setData(initialData);
      setIsServerOnline(isServer);
    }
    loadInitial();
  }, []);

  // Đồng bộ lưu trữ
  useEffect(() => {
    if (data.partners && data.partners.length > 0) {
      syncSaveData(data);
    }
  }, [data]);

  function showToast(message, type = 'success') {
    setToastMessage({ message, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  }

  // --------------------------------------------------------------------------
  // TÍNH TOÁN THEO KỲ THÁNG (PLAN V5 ENGINE)
  // --------------------------------------------------------------------------
  const settlementResult = useMemo(() => {
    return calculateMonthlySettlement(selectedMonth, {
      partners: data.partners,
      customers: data.customers,
      visits: data.visits,
      settlements: data.settlements
    });
  }, [selectedMonth, data]);

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
  // HANDLERS: QUYẾT TOÁN & CHỐT SỔ THÁNG (SETTLEMENTS - SERVER TỰ TÍNH)
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

    showToast(`Đã chốt sổ thành công kỳ ${month}!`);
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

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-800">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        settlementStatus={settlementResult}
        onResetData={handleResetData}
        onOpenAuditLogs={handleOpenAuditLogs}
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
              {/* 3.2 4 Chỉ số: Doanh thu kỳ · Hoa hồng CTV · Phần nền tảng · Phí nhánh 1% */}
              <StatCards settlementResult={settlementResult} />

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <RecentReferrals
                    settlementResult={settlementResult}
                    onNavigateTab={setActiveTab}
                    onViewCustomerProfile={handleViewCustomerProfile}
                    customers={data.customers}
                  />
                </div>
                <div className="lg:col-span-1">
                  <TopPartners
                    settlementResult={settlementResult}
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
                  partners={data.partners}
                  settlementResult={settlementResult}
                  onAddPartner={handleOpenNewPartner}
                  onSelectPartner={handleEditPartner}
                />
              ) : (
                <PartnerList
                  partners={data.partners}
                  settlementResult={settlementResult}
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
                customers={data.customers}
                visits={data.visits}
                partners={data.partners}
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
                settlementResult={settlementResult}
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

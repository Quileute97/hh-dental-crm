/**
 * DENTAL CRM - SUPABASE API SERVICE
 * Toàn bộ dữ liệu & tính toán hoa hồng được chuyển sang Supabase Postgres & RPC
 */
import { supabase } from '../lib/supabase';
import { 
  INITIAL_PARTNERS, 
  INITIAL_SERVICES, 
  INITIAL_CUSTOMERS, 
  INITIAL_VISITS 
} from '../data/initialData';

// ----------------------------------------------------------------------------
// 1. LẤY TOÀN BỘ DỮ LIỆU ĐANG HOẠT ĐỘNG
// ----------------------------------------------------------------------------
export async function fetchAllData() {
  try {
    const [
      { data: partnersData, error: errPartners },
      { data: servicesData, error: errServices },
      { data: customersData, error: errCustomers },
      { data: visitsData, error: errVisits },
      { data: settlementsData, error: errSettlements }
    ] = await Promise.all([
      supabase.from('partners').select('*').order('depth', { ascending: true }),
      supabase.from('services').select('*').order('name'),
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
      supabase.from('visits').select('*').order('occurred_at', { ascending: false }),
      supabase.from('settlements').select('*')
    ]);

    if (!errPartners && partnersData && partnersData.length > 0) {
      return {
        isServer: true,
        data: {
          partners: partnersData.map(p => ({
            id: p.id,
            code: p.code,
            name: p.name,
            title: p.title,
            phone: p.phone,
            email: p.email,
            parentId: p.parent_id,
            depth: p.depth,
            status: p.status,
            bankName: p.bank_name,
            bankAccountNo: p.bank_account_no,
            bankAccountName: p.bank_account_name,
            joinedAt: p.joined_at,
            createdAt: p.created_at
          })),
          services: (servicesData || []).map(s => ({
            id: s.id,
            code: s.code,
            name: s.name,
            defaultPrice: Number(s.default_price || 0),
            active: s.active
          })),
          customers: (customersData || []).map(c => ({
            id: c.id,
            code: c.code,
            name: c.name,
            phone: c.phone,
            ownerPartnerId: c.owner_partner_id,
            referrerCustomerId: c.referrer_customer_id,
            depth: c.depth,
            treatment: c.treatment,
            status: c.status,
            createdAt: c.created_at
          })),
          visits: (visitsData || []).map(v => ({
            id: v.id,
            customerId: v.customer_id,
            amount: Number(v.amount || 0),
            note: v.note,
            occurredAt: v.occurred_at,
            createdAt: v.created_at
          })),
          settlements: (settlementsData || []).map(s => ({
            month: s.month,
            partnerId: s.partner_id,
            partnerCode: s.partner_code,
            partnerName: s.partner_name,
            ownRevenue: Number(s.own_revenue || 0),
            branchRevenue: Number(s.branch_revenue || 0),
            commission: Number(s.commission || 0),
            branchFee: Number(s.branch_fee || 0),
            total: Number(s.total || 0),
            settledAt: s.settled_at
          }))
        }
      };
    }
  } catch (err) {
    console.warn('[Supabase API] Failed to fetch live data from Supabase, falling back to local seed:', err);
  }

  // Fallback seed ban đầu nếu chưa migrate hoặc chưa có biến môi trường
  return {
    isServer: false,
    data: {
      partners: INITIAL_PARTNERS,
      services: INITIAL_SERVICES,
      customers: INITIAL_CUSTOMERS,
      visits: INITIAL_VISITS,
      settlements: []
    }
  };
}

// ----------------------------------------------------------------------------
// 2. SERVER-SIDE RPC: TÍNH HOA HỒNG & PHÍ NHÁNH TRÊN POSTGRES (KHÔNG TÍNH CLIENT)
// ----------------------------------------------------------------------------
export async function apiComputeMonth(month) {
  try {
    const { data, error } = await supabase.rpc('compute_month', { p_month: month });
    if (error) throw error;
    if (data && Array.isArray(data)) {
      return {
        ok: true,
        rows: data.map(r => ({
          partnerId: r.partner_id,
          ownRevenue: Number(r.own_revenue || 0),
          branchRevenue: Number(r.branch_revenue || 0),
          commission: Number(r.commission || 0),
          branchFee: Number(r.branch_fee || 0),
          total: Number(r.total || 0)
        }))
      };
    }
  } catch (err) {
    console.error('[Supabase RPC] compute_month error:', err);
  }
  return { ok: false, rows: [] };
}

// ----------------------------------------------------------------------------
// 3. SERVER-SIDE RPC: CHỐT SỔ THÁNG (SETTLEMENTS TRÊN POSTGRES)
// ----------------------------------------------------------------------------
export async function apiSettleMonth(month, force = false) {
  try {
    const { data, error } = await supabase.rpc('settle_month', { 
      p_month: month, 
      p_force: force 
    });

    if (error) {
      const msg = error.message || '';
      const isAlreadySettled = msg.includes('đã chốt') || msg.includes('p_force = true');
      return {
        ok: false,
        status: isAlreadySettled ? 409 : 400,
        requiresConfirm: isAlreadySettled,
        error: msg
      };
    }

    return {
      ok: true,
      status: 200,
      data: {
        settlements: (data || []).map(s => ({
          month: s.month,
          partnerId: s.partner_id,
          partnerCode: s.partner_code,
          partnerName: s.partner_name,
          ownRevenue: Number(s.own_revenue || 0),
          branchRevenue: Number(s.branch_revenue || 0),
          commission: Number(s.commission || 0),
          branchFee: Number(s.branch_fee || 0),
          total: Number(s.total || 0),
          settledAt: s.settled_at
        }))
      }
    };
  } catch (err) {
    return { ok: false, status: 500, error: err.message };
  }
}

// Alias tương thích code cũ
export const apiSaveSettlement = apiSettleMonth;

// ----------------------------------------------------------------------------
// 4. QUẢN LÝ ĐỐI TÁC (PARTNERS)
// ----------------------------------------------------------------------------
export async function apiSavePartner(partner) {
  try {
    const record = {
      id: partner.id,
      code: partner.code,
      name: partner.name,
      title: partner.title,
      phone: partner.phone,
      email: partner.email,
      parent_id: partner.parentId || null,
      depth: partner.depth || 0,
      status: partner.status || 'ACTIVE',
      bank_name: partner.bankName,
      bank_account_no: partner.bankAccountNo,
      bank_account_name: partner.bankAccountName
    };
    const { error } = await supabase.from('partners').upsert(record);
    return !error;
  } catch (err) {
    return false;
  }
}

export async function apiTogglePartnerStatus(partnerId) {
  try {
    const { data: p } = await supabase.from('partners').select('status').eq('id', partnerId).single();
    if (!p) return false;
    const nextStatus = p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const { error } = await supabase.from('partners').update({ status: nextStatus }).eq('id', partnerId);
    return !error;
  } catch (err) {
    return false;
  }
}

// ----------------------------------------------------------------------------
// 5. QUẢN LÝ KHÁCH HÀNG (CUSTOMERS) & LƯỢT ĐIỀU TRỊ (VISITS)
// ----------------------------------------------------------------------------
export async function apiSaveCustomer(customer, initialVisit = null) {
  try {
    const custRecord = {
      id: customer.id,
      code: customer.code,
      name: customer.name,
      phone: customer.phone,
      owner_partner_id: customer.ownerPartnerId,
      referrer_customer_id: customer.referrerCustomerId || null,
      depth: customer.depth || 1,
      treatment: customer.treatment,
      status: customer.status || 'completed'
    };
    const { error: errCust } = await supabase.from('customers').upsert(custRecord);
    if (errCust) return false;

    if (initialVisit) {
      await apiAddVisit(initialVisit);
    }
    return true;
  } catch (err) {
    return false;
  }
}

export async function apiAddVisit(visit) {
  try {
    const visitRecord = {
      id: visit.id,
      customer_id: visit.customerId,
      amount: visit.amount,
      note: visit.note || 'Lượt điều trị',
      occurred_at: visit.occurredAt || new Date().toISOString()
    };
    const { error } = await supabase.from('visits').upsert(visitRecord);
    return !error;
  } catch (err) {
    return false;
  }
}

// ----------------------------------------------------------------------------
// 6. QUẢN LÝ GÓI DỊCH VỤ (SERVICES)
// ----------------------------------------------------------------------------
export async function apiSaveService(service) {
  try {
    const record = {
      id: service.id,
      code: service.code || service.id,
      name: service.name,
      default_price: service.defaultPrice || 0,
      active: true
    };
    const { data, error } = await supabase.from('services').upsert(record).select().single();
    return { ok: !error, data };
  } catch (err) {
    return { ok: false };
  }
}

export async function apiDeleteService(serviceId) {
  try {
    const { error } = await supabase.from('services').delete().eq('id', serviceId);
    return !error;
  } catch (err) {
    return false;
  }
}

// ----------------------------------------------------------------------------
// 7. NHẬT KÝ KIỂM TOÁN (AUDIT LOGS)
// ----------------------------------------------------------------------------
export async function apiFetchAuditLogs() {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    return data || [];
  } catch (err) {
    return [];
  }
}

// Hỗ trợ đồng bộ giao diện
export async function syncSaveData() {
  // Không cần localStorage theo nguyên tắc Supabase
}

export async function apiResetData() {
  const { data } = await fetchAllData();
  return data;
}

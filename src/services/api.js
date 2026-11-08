/**
 * DENTAL CRM - SUPABASE API SERVICE
 * Toàn bộ dữ liệu & tính toán hoa hồng kết nối trực tiếp Supabase Postgres & RPC
 * Hoạt động 100% trên dữ liệu thật, không sử dụng Mock Data
 */
import { supabase } from '../lib/supabase.js';
import { generateUuid, isUuid } from '../utils/uuid.js';

// ----------------------------------------------------------------------------
// 1. LẤY TOÀN BỘ DỮ LIỆU ĐANG HOẠT ĐỘNG
// ----------------------------------------------------------------------------
export async function fetchAllData() {
  try {
    const [pRes, sRes, cRes, vRes, stRes] = await Promise.allSettled([
      supabase.from('partners').select('*').order('depth', { ascending: true }),
      supabase.from('services').select('*').order('name'),
      supabase.from('customers').select('*').order('created_at', { ascending: false }),
      supabase.from('visits').select('*').order('occurred_at', { ascending: false }),
      supabase.from('settlements').select('*')
    ]);

    const partnersData = (pRes.status === 'fulfilled' && !pRes.value.error) ? pRes.value.data : [];
    const servicesData = (sRes.status === 'fulfilled' && !sRes.value.error) ? sRes.value.data : [];
    const customersData = (cRes.status === 'fulfilled' && !cRes.value.error) ? cRes.value.data : [];
    const visitsData = (vRes.status === 'fulfilled' && !vRes.value.error) ? vRes.value.data : [];
    const settlementsData = (stRes.status === 'fulfilled' && !stRes.value.error) ? stRes.value.data : [];

    // Kiểm tra nếu có lỗi token hết hạn (401 / JWT expired)
    const allErrors = [pRes, sRes, cRes, vRes, stRes]
      .filter(r => r.status === 'fulfilled' && r.value.error)
      .map(r => r.value.error);

    const hasAuthError = allErrors.some(e => e.code === 'PGRST301' || (e.message || '').toLowerCase().includes('jwt') || (e.message || '').toLowerCase().includes('token'));
    if (hasAuthError) {
      await supabase.auth.signOut().catch(() => {});
      return {
        isServer: false,
        data: null,
        error: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại hệ thống.'
      };
    }

    return {
      isServer: true,
      data: {
        partners: (partnersData || []).map(p => ({
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
          paymentStatus: v.payment_status || (v.note && (v.note.toLowerCase().includes('chưa thanh toán') || v.note.toLowerCase().includes('ghi nợ')) ? 'pending' : (v.note && v.note.toLowerCase().includes('thanh toán một phần')) ? 'partial' : 'paid'),
          treatmentStep: v.treatment_step || null,
          serviceCode: v.service_code || null,
          serviceName: v.service_name || null,
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
  } catch (err) {
    console.warn('[Supabase API] Failed to fetch live data from Supabase:', err);
    return {
      isServer: false,
      data: {
        partners: [],
        services: [],
        customers: [],
        visits: [],
        settlements: []
      },
      error: err?.message || 'Không thể kết nối máy chủ Supabase.'
    };
  }
}

function isForbiddenError(error) {
  if (!error) return false;
  const code = error.code || '';
  const msg = (error.message || '').toLowerCase();
  return (
    code === 'P0001' ||
    code === '42501' ||
    msg.includes('không có quyền') ||
    msg.includes('yêu cầu đăng nhập') ||
    msg.includes('permission denied')
  );
}

// ----------------------------------------------------------------------------
// 2. SERVER-SIDE RPC: TÍNH HOA HỒNG & PHÍ NHÁNH TRÊN POSTGRES (KHÔNG TÍNH CLIENT)
// ----------------------------------------------------------------------------
export async function apiComputeMonth(month) {
  try {
    const { data, error } = await supabase.rpc('compute_month', { p_month: month });
    if (error) {
      if (isForbiddenError(error)) {
        return { ok: false, reason: 'forbidden', rows: [] };
      }
      throw error;
    }
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
    if (isForbiddenError(err)) {
      return { ok: false, reason: 'forbidden', rows: [] };
    }
    console.warn('[Supabase RPC] compute_month fallback:', err?.message || err);
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
      if (isForbiddenError(error)) {
        return {
          ok: false,
          reason: 'forbidden',
          status: 403,
          error: error.message || 'Không có quyền thực hiện chốt sổ.'
        };
      }
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
    if (isForbiddenError(err)) {
      return {
        ok: false,
        reason: 'forbidden',
        status: 403,
        error: err?.message || 'Không có quyền thực hiện chốt sổ.'
      };
    }
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
    const isEdit = isUuid(partner.id);
    const parentIdValid = isUuid(partner.parentId) ? partner.parentId : null;

    const record = {
      ...(isEdit ? { id: partner.id } : { id: generateUuid() }),
      code: partner.code,
      name: partner.name,
      title: partner.title || null,
      phone: partner.phone,
      email: partner.email || null,
      parent_id: parentIdValid,
      depth: partner.depth || 0,
      status: partner.status || 'ACTIVE',
      bank_name: partner.bankName || null,
      bank_account_no: partner.bankAccountNo || null,
      bank_account_name: partner.bankAccountName || null
    };

    const { data, error } = await supabase.from('partners').upsert(record).select().single();
    if (error) {
      console.error('[apiSavePartner error]:', error);
      return { ok: false, error: error.message };
    }

    return {
      ok: true,
      data: {
        id: data.id,
        code: data.code,
        name: data.name,
        title: data.title,
        phone: data.phone,
        email: data.email,
        parentId: data.parent_id,
        depth: data.depth,
        status: data.status,
        bankName: data.bank_name,
        bankAccountNo: data.bank_account_no,
        bankAccountName: data.bank_account_name,
        joinedAt: data.joined_at,
        createdAt: data.created_at
      }
    };
  } catch (err) {
    console.error('[apiSavePartner exception]:', err);
    return { ok: false, error: err.message };
  }
}

export async function apiTogglePartnerStatus(partnerId) {
  try {
    if (!isUuid(partnerId)) return false;
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
    const isEdit = isUuid(customer.id);
    const ownerPartnerValid = isUuid(customer.ownerPartnerId) ? customer.ownerPartnerId : null;
    const refCustValid = isUuid(customer.referrerCustomerId) ? customer.referrerCustomerId : null;

    const custRecord = {
      ...(isEdit ? { id: customer.id } : { id: generateUuid() }),
      code: customer.code,
      name: customer.name,
      phone: customer.phone,
      owner_partner_id: ownerPartnerValid,
      referrer_customer_id: refCustValid,
      depth: customer.depth || 1,
      treatment: customer.treatment || null,
      status: customer.status || 'completed'
    };

    const { data: savedCust, error: errCust } = await supabase.from('customers').upsert(custRecord).select().single();
    if (errCust) {
      console.error('[apiSaveCustomer error]:', errCust);
      return { ok: false, error: errCust.message };
    }

    let savedVisitData = null;
    if (initialVisit) {
      const visitRes = await apiAddVisit({
        ...initialVisit,
        customerId: savedCust.id
      });
      if (visitRes.ok) {
        savedVisitData = visitRes.data;
      }
    }

    return {
      ok: true,
      data: {
        customer: {
          id: savedCust.id,
          code: savedCust.code,
          name: savedCust.name,
          phone: savedCust.phone,
          ownerPartnerId: savedCust.owner_partner_id,
          referrerCustomerId: savedCust.referrer_customer_id,
          depth: savedCust.depth,
          treatment: savedCust.treatment,
          status: savedCust.status,
          createdAt: savedCust.created_at
        },
        visit: savedVisitData
      }
    };
  } catch (err) {
    console.error('[apiSaveCustomer exception]:', err);
    return { ok: false, error: err.message };
  }
}

export async function apiAddVisit(visit) {
  try {
    const isEdit = isUuid(visit.id);
    const customerIdValid = isUuid(visit.customerId) ? visit.customerId : null;
    if (!customerIdValid) {
      return { ok: false, error: 'customerId không hợp lệ (yêu cầu UUID)' };
    }

    const visitRecord = {
      ...(isEdit ? { id: visit.id } : { id: generateUuid() }),
      customer_id: customerIdValid,
      amount: Number(visit.amount || 0),
      note: visit.note || 'Lượt điều trị',
      occurred_at: visit.occurredAt || new Date().toISOString(),
      payment_status: visit.paymentStatus || 'paid',
      treatment_step: visit.treatmentStep || visit.step || null,
      service_code: visit.serviceCode || null,
      service_name: visit.serviceName || visit.package || null
    };

    let { data, error } = await supabase.from('visits').upsert(visitRecord).select().single();
    if (error && (error.code === 'PGRST204' || (error.message || '').includes('schema cache') || error.code === '42703')) {
      // Fallback nếu database Supabase chưa apply migration 006_visit_clinical_fields.sql:
      // Lưu thông tin gói / bước / trạng thái vào note để không mất dữ liệu lâm sàng
      const fallbackNote = [
        visit.serviceName ? `Gói: ${visit.serviceName}` : null,
        visit.treatmentStep || visit.step ? `Bước: ${visit.treatmentStep || visit.step}` : null,
        visit.paymentStatus ? `TT: ${visit.paymentStatus}` : null,
        visit.note
      ].filter(Boolean).join(' | ');

      const fallbackRecord = {
        ...(isEdit ? { id: visit.id } : { id: generateUuid() }),
        customer_id: customerIdValid,
        amount: Number(visit.amount || 0),
        note: fallbackNote || 'Lượt điều trị',
        occurred_at: visit.occurredAt || new Date().toISOString()
      };

      const fallbackRes = await supabase.from('visits').upsert(fallbackRecord).select().single();
      data = fallbackRes.data;
      error = fallbackRes.error;
    }

    if (error) {
      console.error('[apiAddVisit error]:', error);
      return { ok: false, error: error.message };
    }

    return {
      ok: true,
      data: {
        id: data.id,
        customerId: data.customer_id,
        amount: Number(data.amount || 0),
        note: data.note,
        occurredAt: data.occurred_at,
        paymentStatus: data.payment_status || 'paid',
        treatmentStep: data.treatment_step || null,
        serviceCode: data.service_code || null,
        serviceName: data.service_name || null,
        createdAt: data.created_at
      }
    };
  } catch (err) {
    console.error('[apiAddVisit exception]:', err);
    return { ok: false, error: err.message };
  }
}

export async function apiDeleteVisit(visitId) {
  try {
    if (!isUuid(visitId)) return false;
    const { error } = await supabase.from('visits').delete().eq('id', visitId);
    return !error;
  } catch (err) {
    return false;
  }
}

export async function apiDeleteCustomer(customerId) {
  try {
    if (!isUuid(customerId)) return false;
    // Xoá các lượt khám liên kết trước
    await supabase.from('visits').delete().eq('customer_id', customerId);
    const { error } = await supabase.from('customers').delete().eq('id', customerId);
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
    const isEdit = isUuid(service.id);
    const record = {
      ...(isEdit ? { id: service.id } : { id: generateUuid() }),
      code: service.code || `S-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      name: service.name,
      default_price: Number(service.defaultPrice || 0),
      active: service.active !== false
    };
    const { data, error } = await supabase.from('services').upsert(record).select().single();
    if (error) {
      console.error('[apiSaveService error]:', error);
      return { ok: false, error: error.message };
    }
    return {
      ok: true,
      data: {
        id: data.id,
        code: data.code,
        name: data.name,
        defaultPrice: Number(data.default_price || 0),
        active: data.active
      }
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export async function apiDeleteService(serviceId) {
  try {
    if (!isUuid(serviceId)) return false;
    const { error } = await supabase.from('services').delete().eq('id', serviceId);
    return !error;
  } catch (err) {
    return false;
  }
}

// ----------------------------------------------------------------------------
// 7. NHẬT KÝ KIỂM TOÁN (AUDIT LOGS)
// ----------------------------------------------------------------------------
export async function apiFetchAuditLogs(limit = 100) {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    return data || [];
  } catch (err) {
    return [];
  }
}

// ----------------------------------------------------------------------------
// 8. QUẢN LÝ TÀI KHOẢN & PHÂN QUYỀN (PROFILES - ADMIN)
// ----------------------------------------------------------------------------
export async function apiFetchProfiles() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('role');
    return data || [];
  } catch (err) {
    return [];
  }
}

export async function apiUpdateProfile(userId, profile) {
  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        user_id: userId,
        role: profile.role,
        partner_id: profile.partner_id || profile.partnerId || null,
        full_name: profile.full_name || profile.fullName || null
      });
    return !error;
  } catch (err) {
    return false;
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

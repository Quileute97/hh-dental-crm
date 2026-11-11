/**
 * DENTAL CRM - SUPABASE API SERVICE
 * Toàn bộ dữ liệu & tính toán hoa hồng kết nối trực tiếp Supabase Postgres & RPC
 * Hoạt động 100% trên dữ liệu thật, không sử dụng Mock Data
 */
import { supabase, createEphemeralAuthClient } from '../lib/supabase.js';
import { generateUuid, isUuid } from '../utils/uuid.js';
import {
  generatePartnerRefCode,
  normalizeRefCode,
  sanitizeSelfSignupRole
} from '../utils/referral.js';

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
// 8. QUẢN LÝ TÀI KHOẢN, PHÂN QUYỀN & LINK GIỚI THIỆU (REFERRAL / PROFILES)
// ----------------------------------------------------------------------------
function mapAuthErrorMessage(err) {
  const msg = (err?.message || '').toLowerCase();
  if (msg.includes('user already registered') || msg.includes('already been registered')) {
    return 'Email này đã được đăng ký trong hệ thống. Vui lòng đăng nhập hoặc dùng email khác.';
  }
  if (msg.includes('password should be at least') || msg.includes('weak password')) {
    return 'Mật khẩu phải có tối thiểu 6 ký tự.';
  }
  if (msg.includes('invalid email') || msg.includes('unable to validate email')) {
    return 'Địa chỉ email không đúng định dạng.';
  }
  if (msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('email_send_rate_limit')) {
    return 'Thao tác gửi yêu cầu quá nhanh. Vui lòng đợi ít phút rồi thử lại.';
  }
  if (msg.includes('signup is disabled') || msg.includes('signups not allowed')) {
    return 'Hệ thống Supabase Auth hiện đang tắt chế độ tự đăng ký. Vui lòng kiểm tra cấu hình Auth.';
  }
  return err?.message || 'Không thể tạo tài khoản. Vui lòng thử lại.';
}

/**
 * Tra cứu đối tác theo mã giới thiệu (REF code), kèm đối tác Gốc F0 của nhánh.
 * Ưu tiên gọi RPC get_partner_by_ref_code (hoạt động an toàn cả khi anon & RLS chặt),
 * fallback sang truy vấn bảng partners trực tiếp nếu chưa chạy migration 009.
 */
export async function apiResolveReferralCode(refCode) {
  const normalized = normalizeRefCode(refCode);
  if (!normalized) return null;

  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc('get_partner_by_ref_code', {
      p_code: normalized
    });

    if (!rpcErr && rpcData) {
      const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      if (row?.id) {
        return {
          id: row.id,
          code: row.code,
          name: row.name,
          title: row.title || null,
          depth: Number(row.depth ?? 0),
          f0Id: row.f0_id || row.id,
          f0Code: row.f0_code || row.code,
          f0Name: row.f0_name || row.name
        };
      }
      return null;
    }
  } catch {
    // Fallback sang bảng partners nếu RPC 009 chưa được deploy
  }

  try {
    const { data: target, error } = await supabase
      .from('partners')
      .select('id, code, name, title, depth, parent_id, status')
      .ilike('code', normalized)
      .maybeSingle();

    if (error || !target || (target.status || 'ACTIVE').toUpperCase() !== 'ACTIVE') {
      return null;
    }

    // Lần ngược cây parent_id tối đa 30 bước để tìm đối tác gốc F0
    let root = target;
    const visited = new Set([target.id]);
    let cursorParentId = target.parent_id;
    let steps = 0;

    while (cursorParentId && !visited.has(cursorParentId) && steps < 30) {
      visited.add(cursorParentId);
      steps += 1;
      const { data: parentRow } = await supabase
        .from('partners')
        .select('id, code, name, parent_id')
        .eq('id', cursorParentId)
        .maybeSingle();
      if (!parentRow) break;
      root = parentRow;
      cursorParentId = parentRow.parent_id;
    }

    return {
      id: target.id,
      code: target.code,
      name: target.name,
      title: target.title || null,
      depth: Number(target.depth ?? 0),
      f0Id: root.id,
      f0Code: root.code,
      f0Name: root.name
    };
  } catch (err) {
    console.warn('[apiResolveReferralCode error]:', err);
    return null;
  }
}

const inFlightProvision = new Map();

/**
 * Cấp phát / đồng bộ bản ghi partners & profiles cho một Auth User đã tồn tại.
 * Bảo vệ idempotent + single-flight để tránh tạo trùng đối tác khi AuthContext và Form cùng chạy.
 */
export async function apiProvisionAccountRecords({
  userId,
  email = '',
  fullName = '',
  phone = '',
  role = 'partner',
  partnerCode = '',
  parentPartnerId = null,
  parentDepthHint = null,
  existingPartnerId = null,
  referrerCode = '',
  forceUpdate = false
}) {
  if (!isUuid(userId)) {
    return { ok: false, error: 'User ID không hợp lệ.' };
  }

  if (!forceUpdate && inFlightProvision.has(userId)) {
    return await inFlightProvision.get(userId);
  }

  const execPromise = (async () => {
    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingProfile && !forceUpdate) {
        let existingPartner = null;
        if (existingProfile.partner_id) {
          const { data: pRow } = await supabase
            .from('partners')
            .select('*')
            .eq('id', existingProfile.partner_id)
            .maybeSingle();
          if (pRow) {
            existingPartner = {
              id: pRow.id,
              code: pRow.code,
              name: pRow.name,
              title: pRow.title,
              phone: pRow.phone,
              email: pRow.email,
              parentId: pRow.parent_id,
              depth: pRow.depth,
              status: pRow.status
            };
          }
        }
        return { ok: true, profile: existingProfile, partner: existingPartner, alreadyExisted: true };
      }

      const displayName = (fullName || '').trim() || (email ? email.split('@')[0] : 'Thành viên mới');
      let resolvedPartnerId = null;
      let createdPartner = null;

      if (role === 'partner') {
        if (isUuid(existingPartnerId)) {
          resolvedPartnerId = existingPartnerId;
        } else if (!forceUpdate && existingProfile?.partner_id) {
          resolvedPartnerId = existingProfile.partner_id;
        } else if (existingProfile?.partner_id && forceUpdate && !isUuid(parentPartnerId) && !normalizeRefCode(referrerCode)) {
          resolvedPartnerId = existingProfile.partner_id;
        } else {
          // Tìm đối tác tuyến trên / F0
          let parentRow = null;
          if (isUuid(parentPartnerId)) {
            const { data: pById } = await supabase
              .from('partners')
              .select('id, code, name, depth')
              .eq('id', parentPartnerId)
              .maybeSingle();
            if (pById) {
              parentRow = pById;
            } else if (parentDepthHint !== null && parentDepthHint !== undefined) {
              parentRow = { id: parentPartnerId, depth: Number(parentDepthHint) };
            } else {
              parentRow = { id: parentPartnerId, depth: 0 };
            }
          } else if (normalizeRefCode(referrerCode)) {
            const refInfo = await apiResolveReferralCode(referrerCode);
            if (refInfo?.id) {
              parentRow = { id: refInfo.id, code: refInfo.code, name: refInfo.name, depth: refInfo.depth };
            }
          }

          const depth = parentRow ? Number(parentRow.depth ?? 0) + 1 : 0;
          const title = parentRow ? `Đối tác Tuyến ${depth}` : 'Đối tác F0 (Gốc)';
          let candidateCode = normalizeRefCode(partnerCode) || generatePartnerRefCode();

          let partnerSaveRes = await apiSavePartner({
            code: candidateCode,
            name: displayName,
            title,
            phone: (phone || '').trim(),
            email: (email || '').trim() || null,
            parentId: parentRow?.id || null,
            depth,
            status: 'ACTIVE'
          });

          if (!partnerSaveRes.ok && (partnerSaveRes.error || '').toLowerCase().includes('duplicate')) {
            candidateCode = generatePartnerRefCode();
            partnerSaveRes = await apiSavePartner({
              code: candidateCode,
              name: displayName,
              title,
              phone: (phone || '').trim(),
              email: (email || '').trim() || null,
              parentId: parentRow?.id || null,
              depth,
              status: 'ACTIVE'
            });
          }

          if (!partnerSaveRes.ok) {
            return {
              ok: false,
              pendingTrigger: isForbiddenError({ message: partnerSaveRes.error }),
              error: partnerSaveRes.error || 'Không thể khởi tạo hồ sơ đối tác.'
            };
          }

          createdPartner = partnerSaveRes.data;
          resolvedPartnerId = createdPartner.id;
        }
      }

      const { data: savedProf, error: profErr } = await supabase
        .from('profiles')
        .upsert({
          user_id: userId,
          role,
          partner_id: role === 'partner' ? resolvedPartnerId : null,
          full_name: displayName
        })
        .select()
        .maybeSingle();

      if (profErr) {
        return {
          ok: false,
          pendingTrigger: isForbiddenError(profErr),
          error: profErr.message
        };
      }

      return {
        ok: true,
        profile: savedProf || {
          user_id: userId,
          role,
          partner_id: role === 'partner' ? resolvedPartnerId : null,
          full_name: displayName
        },
        partner: createdPartner
      };
    } catch (err) {
      return { ok: false, error: err?.message || 'Lỗi đồng bộ hồ sơ tài khoản.' };
    }
  })();

  if (!forceUpdate) {
    inFlightProvision.set(userId, execPromise);
  }
  try {
    return await execPromise;
  } finally {
    if (!forceUpdate) {
      inFlightProvision.delete(userId);
    }
  }
}

/**
 * Tạo tài khoản Supabase Auth kèm Tick phân quyền ngay từ đầu & Gắn cây Đối tác F0 (nếu là CTV).
 * - useEphemeralClient = true (Admin): Không ghi đè phiên đăng nhập Admin hiện tại.
 * - useEphemeralClient = false (Người dùng tự đăng ký): Giới hạn role chỉ nhận 'partner' | 'frontdesk'.
 */
export async function apiCreateAccountWithRole({
  email,
  password,
  fullName,
  phone = '',
  role = 'partner',
  partnerCode = '',
  parentPartnerId = null,
  existingPartnerId = null,
  referrerCode = '',
  useEphemeralClient = false
}) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanName = (fullName || '').trim();
  const cleanPhone = (phone || '').trim();
  const cleanRef = normalizeRefCode(referrerCode);
  const effectiveRole = useEphemeralClient ? role : sanitizeSelfSignupRole(role);

  if (!cleanEmail || !password || password.length < 6) {
    return { ok: false, error: 'Vui lòng nhập email hợp lệ và mật khẩu tối thiểu 6 ký tự.' };
  }

  let resolvedReferrer = null;
  let finalParentId = isUuid(parentPartnerId) ? parentPartnerId : null;
  let parentDepthHint = null;
  let effectiveRefCode = cleanRef;

  if (effectiveRole === 'partner' && !isUuid(existingPartnerId) && effectiveRefCode && !finalParentId) {
    resolvedReferrer = await apiResolveReferralCode(effectiveRefCode);
    if (resolvedReferrer) {
      finalParentId = resolvedReferrer.id;
      parentDepthHint = resolvedReferrer.depth;
      effectiveRefCode = resolvedReferrer.code;
    } else if (useEphemeralClient) {
      return { ok: false, error: `Mã giới thiệu "${effectiveRefCode}" không tồn tại hoặc đang tạm dừng.` };
    } else {
      // Nếu tự đăng ký qua URL mà mã ?ref= không tồn tại/tạm dừng -> âm thầm tạo đối tác gốc F0
      effectiveRefCode = '';
    }
  }

  const finalPartnerCode =
    effectiveRole === 'partner' && !isUuid(existingPartnerId)
      ? (normalizeRefCode(partnerCode) || generatePartnerRefCode())
      : null;

  const authClient = useEphemeralClient ? createEphemeralAuthClient() : supabase;

  try {
    const { data, error } = await authClient.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: cleanName || cleanEmail.split('@')[0],
          phone: cleanPhone,
          requested_role: effectiveRole,
          partner_code: finalPartnerCode,
          parent_partner_id: effectiveRole === 'partner' ? finalParentId : null,
          existing_partner_id: effectiveRole === 'partner' && isUuid(existingPartnerId) ? existingPartnerId : null,
          referrer_code: effectiveRole === 'partner' ? (effectiveRefCode || null) : null
        }
      }
    });

    if (error) {
      return { ok: false, error: mapAuthErrorMessage(error) };
    }

    if (data?.user?.identities && data.user.identities.length === 0) {
      return { ok: false, error: 'Email này đã được đăng ký trong hệ thống. Vui lòng đăng nhập hoặc dùng email khác.' };
    }

    const createdUser = data?.user;
    if (!createdUser?.id) {
      return { ok: false, error: 'Không nhận được thông tin tài khoản từ Supabase Auth.' };
    }

    const provisionRes = await apiProvisionAccountRecords({
      userId: createdUser.id,
      email: cleanEmail,
      fullName: cleanName,
      phone: cleanPhone,
      role: effectiveRole,
      partnerCode: finalPartnerCode,
      parentPartnerId: finalParentId,
      parentDepthHint,
      existingPartnerId,
      referrerCode: effectiveRefCode,
      forceUpdate: useEphemeralClient
    });

    if (!provisionRes.ok && useEphemeralClient) {
      return {
        ok: false,
        user: createdUser,
        error: `Tài khoản Auth đã tạo nhưng lỗi lưu hồ sơ: ${provisionRes.error}`
      };
    }

    return {
      ok: true,
      user: createdUser,
      session: data?.session || null,
      requiresEmailConfirmation: !data?.session,
      profile: provisionRes.profile || null,
      partner: provisionRes.partner || null,
      resolvedReferrer,
      pendingTrigger: Boolean(provisionRes.pendingTrigger)
    };
  } catch (err) {
    return { ok: false, error: mapAuthErrorMessage(err) };
  }
}

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

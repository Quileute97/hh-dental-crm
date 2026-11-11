/**
 * HH DENTAL CRM - REFERRAL LINK & PARTNER F0 TREE HELPERS
 * Thuần JS, an toàn cho cả Browser lẫn Node ESM tests.
 */

export const REFERRAL_STORAGE_KEY = 'hh_dental_ref_code';

export const SELF_SIGNUP_ROLES = ['partner', 'frontdesk'];

/**
 * Chuẩn hóa mã giới thiệu (REF code)
 */
export function normalizeRefCode(code) {
  if (typeof code !== 'string') return '';
  return code.trim().toUpperCase();
}

/**
 * Chỉ cho phép 2 vai trò công khai khi tự đăng ký: 'partner' | 'frontdesk'
 * Ngăn chặn leo thang đặc quyền ('admin' | 'accountant') từ client/URL.
 */
export function sanitizeSelfSignupRole(requestedRole) {
  const normalized = typeof requestedRole === 'string' ? requestedRole.trim().toLowerCase() : '';
  return normalized === 'frontdesk' ? 'frontdesk' : 'partner';
}

/**
 * Tạo Link Giới Thiệu cho Đối tác: https://<origin>/?ref=<PARTNER_CODE>
 */
export function buildPartnerReferralLink(partnerCode, origin) {
  const code = normalizeRefCode(partnerCode);
  if (!code) return '';

  let resolvedOrigin = origin;
  if (resolvedOrigin === undefined && typeof window !== 'undefined' && window.location) {
    resolvedOrigin = window.location.origin;
  }

  const base = typeof resolvedOrigin === 'string' ? resolvedOrigin.replace(/\/+$/, '') : '';
  return `${base}/?ref=${encodeURIComponent(code)}`;
}

/**
 * Trích xuất mã ?ref=... từ query string
 */
export function getReferralCodeFromSearch(searchStr = '') {
  if (!searchStr || typeof searchStr !== 'string') return '';
  try {
    const query = searchStr.startsWith('?') ? searchStr : `?${searchStr}`;
    const params = new URLSearchParams(query);
    return normalizeRefCode(params.get('ref') || '');
  } catch {
    return '';
  }
}

export function getReferralCodeFromUrl() {
  if (typeof window === 'undefined' || !window.location) return '';
  return getReferralCodeFromSearch(window.location.search);
}

export function saveReferralCode(code) {
  const normalized = normalizeRefCode(code);
  if (!normalized || typeof window === 'undefined') return;
  try {
    window.sessionStorage?.setItem(REFERRAL_STORAGE_KEY, normalized);
  } catch {
    // Ignore storage quota/privacy mode errors
  }
}

export function getSavedReferralCode() {
  if (typeof window === 'undefined') return '';
  try {
    return normalizeRefCode(window.sessionStorage?.getItem(REFERRAL_STORAGE_KEY) || '');
  } catch {
    return '';
  }
}

export function clearSavedReferralCode() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage?.removeItem(REFERRAL_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export function stripReferralFromUrl() {
  if (typeof window === 'undefined' || !window.history || !window.location) return;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has('ref')) {
      url.searchParams.delete('ref');
      const nextUrl = url.pathname + (url.search ? url.search : '') + url.hash;
      window.history.replaceState({}, '', nextUrl);
    }
  } catch {
    // Ignore
  }
}

/**
 * Sinh mã đối tác ngẫu nhiên ngắn gọn, dễ đọc (VD: REF-A7K2M9)
 */
export function generatePartnerRefCode(prefix = 'REF') {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${prefix}-${suffix}`;
}

/**
 * Lần ngược cây parentId để tìm Đối tác Gốc (F0) của một đối tác bất kỳ.
 * Có bảo vệ chống vòng lặp (visited Set).
 */
export function getRootF0Partner(partnerId, partners = []) {
  if (!partnerId || !Array.isArray(partners) || partners.length === 0) {
    return { root: null, chain: [] };
  }

  const map = new Map(partners.map(p => [p.id, p]));
  let current = map.get(partnerId) || null;
  if (!current) {
    return { root: null, chain: [] };
  }

  const visited = new Set();
  const chain = [];

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    chain.push(current);
    if (!current.parentId || !map.has(current.parentId)) {
      break;
    }
    current = map.get(current.parentId);
  }

  // chain[chain.length - 1] là nút cao nhất (F0)
  return {
    root: chain[chain.length - 1] || null,
    chain
  };
}

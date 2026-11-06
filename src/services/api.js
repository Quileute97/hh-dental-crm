import { 
  INITIAL_PARTNERS, 
  INITIAL_SERVICES, 
  INITIAL_CUSTOMERS, 
  INITIAL_VISITS, 
  INITIAL_SETTLEMENTS,
  INITIAL_REFERRALS, 
  INITIAL_COMMISSIONS,
  migrateDatabase 
} from '../data/initialData';

const STORAGE_KEY = 'dental_crm_multilevel_v2';
const LEGACY_STORAGE_KEY = 'dental_crm_multilevel_v1';
const API_BASE = 'http://localhost:3001/api';

export async function fetchAllData() {
  try {
    const res = await fetch(`${API_BASE}/data`, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return { data: migrateDatabase(json.data), isServer: true };
      }
    }
  } catch (err) {
    // Backend offline -> fallback to localStorage
  }

  // Fallback to localStorage
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw) {
      return { data: migrateDatabase(JSON.parse(raw)), isServer: false };
    }
  } catch (e) {
    console.error('Failed to load local storage:', e);
  }

  const defaultState = {
    partners: INITIAL_PARTNERS,
    services: INITIAL_SERVICES,
    customers: INITIAL_CUSTOMERS,
    visits: INITIAL_VISITS,
    settlements: INITIAL_SETTLEMENTS,
    referrals: INITIAL_REFERRALS,
    commissions: INITIAL_COMMISSIONS,
  };
  return { data: defaultState, isServer: false };
}

export async function syncSaveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {}
}

export async function apiSavePartner(partner) {
  try {
    const res = await fetch(`${API_BASE}/partners`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partner)
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

export async function apiTogglePartnerStatus(partnerId) {
  try {
    const res = await fetch(`${API_BASE}/partners/${partnerId}/toggle-status`, { method: 'POST' });
    return res.ok;
  } catch (e) {
    return false;
  }
}

export async function apiSaveCustomer(customer, initialVisit = null) {
  try {
    const res = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customer, initialVisit })
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

export async function apiAddVisit(visit) {
  try {
    const res = await fetch(`${API_BASE}/visits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(visit)
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

export async function apiSaveService(service) {
  try {
    const res = await fetch(`${API_BASE}/services`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(service)
    });
    if (res.ok) {
      const json = await res.json();
      return { ok: true, data: json };
    }
    return { ok: false };
  } catch (e) {
    return { ok: false };
  }
}

export async function apiDeleteService(serviceId) {
  try {
    const res = await fetch(`${API_BASE}/services/${serviceId}`, {
      method: 'DELETE'
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

export async function apiSaveSettlement(month, force = false) {
  try {
    const res = await fetch(`${API_BASE}/settlements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ month, force })
    });
    const json = await res.json().catch(() => ({}));
    return {
      ok: res.ok,
      status: res.status,
      data: json,
      requiresConfirm: json.requiresConfirm || false,
      error: json.error || null
    };
  } catch (e) {
    return { ok: false, status: 0, error: e.message };
  }
}

export async function apiResetData() {
  try {
    const res = await fetch(`${API_BASE}/reset-data`, { method: 'POST' });
    if (res.ok) {
      const json = await res.json();
      return migrateDatabase(json.data);
    }
  } catch (e) {}

  const defaultState = {
    partners: INITIAL_PARTNERS,
    services: INITIAL_SERVICES,
    customers: INITIAL_CUSTOMERS,
    visits: INITIAL_VISITS,
    settlements: INITIAL_SETTLEMENTS,
    referrals: INITIAL_REFERRALS,
    commissions: INITIAL_COMMISSIONS,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultState));
  return defaultState;
}

export async function apiFetchAuditLogs() {
  try {
    const res = await fetch(`${API_BASE}/audit-logs`);
    if (res.ok) {
      const json = await res.json();
      return json.logs || [];
    }
  } catch (e) {}
  return [];
}

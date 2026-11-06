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

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return migrateDatabase(parsed);
    }
  } catch (e) {
    console.error('Failed to load from localStorage', e);
  }

  return {
    partners: INITIAL_PARTNERS,
    services: INITIAL_SERVICES,
    customers: INITIAL_CUSTOMERS,
    visits: INITIAL_VISITS,
    settlements: INITIAL_SETTLEMENTS,
    referrals: INITIAL_REFERRALS,
    commissions: INITIAL_COMMISSIONS,
  };
}

export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
}

export function resetToDefault() {
  const defaultState = {
    partners: INITIAL_PARTNERS,
    services: INITIAL_SERVICES,
    customers: INITIAL_CUSTOMERS,
    visits: INITIAL_VISITS,
    settlements: INITIAL_SETTLEMENTS,
    referrals: INITIAL_REFERRALS,
    commissions: INITIAL_COMMISSIONS,
  };
  saveData(defaultState);
  return defaultState;
}

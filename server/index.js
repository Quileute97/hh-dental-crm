import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { calculateMonthlySettlement } from '../src/services/commissionEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const AUDIT_LOG_FILE = path.join(DATA_DIR, 'audit.log');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// --------------------------------------------------------------------------
// MIGRATION & KHỞI TẠO DỮ LIỆU
// --------------------------------------------------------------------------
function getInitialSeed() {
  return {
    partners: [
      {
        id: 'P1',
        code: 'REF-A-FOUNDER',
        name: 'Bs. Nguyễn Văn A',
        title: 'Bác sĩ Sáng lập (Founding Partner)',
        phone: '0901 000 001',
        email: 'dr.a@nhakhoaviet.vn',
        parentId: null,
        depth: 0,
        level: null, // @deprecated — dùng depth
        status: 'ACTIVE',
        bankName: 'Vietcombank',
        bankAccountNo: '0071000123456',
        bankAccountName: 'NGUYEN VAN A',
        joinedDate: '2026-01-10',
      },
      {
        id: 'P2',
        code: 'REF-B-LEVEL4',
        name: 'Trần Thị B',
        title: 'Đối tác Tuyến 1 (Tuyển bởi Bs. A)',
        phone: '0901 000 002',
        email: 'tranb@dentalpartner.vn',
        parentId: 'P1',
        depth: 1,
        level: null, // @deprecated — dùng depth
        status: 'ACTIVE',
        bankName: 'Techcombank',
        bankAccountNo: '1903000654321',
        bankAccountName: 'TRAN THI B',
        joinedDate: '2026-02-15',
      },
      {
        id: 'P3',
        code: 'REF-C-LEVEL3',
        name: 'Lê Hoàng C',
        title: 'Đối tác Tuyến 2 (Tuyển bởi B)',
        phone: '0901 000 003',
        email: 'lehoangc@gmail.com',
        parentId: 'P2',
        depth: 2,
        level: null, // @deprecated — dùng depth
        status: 'ACTIVE',
        bankName: 'MB Bank',
        bankAccountNo: '08889998888',
        bankAccountName: 'LE HOANG C',
        joinedDate: '2026-03-01',
      },
      {
        id: 'P4',
        code: 'REF-D-LEVEL2',
        name: 'Phạm Minh D',
        title: 'Đối tác Tuyến 3 (Tuyển bởi C)',
        phone: '0901 000 004',
        email: 'phamminhd@gmail.com',
        parentId: 'P3',
        depth: 3,
        level: null, // @deprecated — dùng depth
        status: 'ACTIVE',
        bankName: 'ACB',
        bankAccountNo: '246813579',
        bankAccountName: 'PHAM MINH D',
        joinedDate: '2026-04-12',
      },
      {
        id: 'P5',
        code: 'REF-D2-LEVEL2',
        name: 'Vũ Thảo D2',
        title: 'Đối tác Tuyến 3 Nhánh 2 (Tuyển bởi C)',
        phone: '0901 000 005',
        email: 'vuthaod2@gmail.com',
        parentId: 'P3',
        depth: 3,
        level: null, // @deprecated — dùng depth
        status: 'ACTIVE',
        bankName: 'VPBank',
        bankAccountNo: '9988776655',
        bankAccountName: 'VU THAO D2',
        joinedDate: '2026-05-20',
      },
      {
        id: 'P6',
        code: 'REF-E-LEVEL1',
        name: 'Đặng Quốc E (CTV)',
        title: 'Đối tác Tuyến 4 (Tuyển bởi D2)',
        phone: '0901 000 006',
        email: 'dangquoce@gmail.com',
        parentId: 'P5',
        depth: 4,
        level: null, // @deprecated — dùng depth
        status: 'ACTIVE',
        bankName: 'BIDV',
        bankAccountNo: '1234567890',
        bankAccountName: 'DANG QUOC E',
        joinedDate: '2026-06-01',
      }
    ],
    services: [
      { id: 'S1', name: 'Cấy ghép Implant Straumann (Thuỵ Sĩ)', defaultPrice: 20000000 },
      { id: 'S2', name: 'Niềng răng trong suốt Invisalign', defaultPrice: 45000000 },
      { id: 'S3', name: 'Bọc răng sứ thẩm mỹ Cercon HT (16 răng)', defaultPrice: 32000000 },
      { id: 'S4', name: 'Tẩy trắng răng Philips Zoom WhiteSpeed', defaultPrice: 4000000 },
      { id: 'S5', name: 'Nhổ răng khôn không đau Piezotome', defaultPrice: 2500000 },
      { id: 'S6', name: 'Chỉnh nha mắc cài sứ tự buộc', defaultPrice: 28000000 },
    ],
    customers: [
      {
        id: 'CUST-001',
        code: 'KH-2026-0001',
        name: 'Hoàng Thị E',
        phone: '0912 999 888',
        ownerPartnerId: 'P1',
        referrerCustomerId: null,
        depth: 1,
        treatment: 'Bọc răng sứ thẩm mỹ Cercon HT (16 răng)',
        status: 'completed',
        createdAt: '2026-11-01T08:30:00.000Z'
      },
      {
        id: 'CUST-002',
        code: 'KH-2026-0002',
        name: 'Đặng Tuấn Kiệt',
        phone: '0988 111 222',
        ownerPartnerId: 'P1',
        referrerCustomerId: 'CUST-001',
        depth: 2,
        treatment: 'Niềng răng trong suốt Invisalign',
        status: 'completed',
        createdAt: '2026-11-02T09:15:00.000Z'
      },
      {
        id: 'CUST-003',
        code: 'KH-2026-0003',
        name: 'Lê Thùy Dung',
        phone: '0977 333 444',
        ownerPartnerId: 'P1',
        referrerCustomerId: 'CUST-001',
        depth: 2,
        treatment: 'Tẩy trắng răng Philips Zoom WhiteSpeed',
        status: 'completed',
        createdAt: '2026-11-03T10:00:00.000Z'
      },
      {
        id: 'CUST-004',
        code: 'KH-2026-0004',
        name: 'Phạm Hải Đăng',
        phone: '0903 555 666',
        ownerPartnerId: 'P2',
        referrerCustomerId: null,
        depth: 1,
        treatment: 'Cấy ghép Implant Straumann (Thuỵ Sĩ)',
        status: 'completed',
        createdAt: '2026-11-04T11:00:00.000Z'
      },
      {
        id: 'CUST-005',
        code: 'KH-2026-0005',
        name: 'Trần Bảo Ngọc',
        phone: '0933 777 888',
        ownerPartnerId: 'P2',
        referrerCustomerId: 'CUST-004',
        depth: 2,
        treatment: 'Chỉnh nha mắc cài sứ tự buộc',
        status: 'completed',
        createdAt: '2026-11-05T14:30:00.000Z'
      },
      {
        id: 'CUST-006',
        code: 'KH-2026-0006',
        name: 'Nguyễn Văn Minh',
        phone: '0944 888 999',
        ownerPartnerId: 'P3',
        referrerCustomerId: null,
        depth: 1,
        treatment: 'Cấy ghép Implant Straumann (Thuỵ Sĩ)',
        status: 'completed',
        createdAt: '2026-11-06T15:00:00.000Z'
      }
    ],
    visits: [
      {
        id: 'VISIT-001-1',
        customerId: 'CUST-001',
        amount: 32000000,
        note: 'Gói đầu tiên: Bọc răng sứ thẩm mỹ Cercon HT',
        occurredAt: '2026-11-01T08:30:00.000Z'
      },
      {
        id: 'VISIT-001-2',
        customerId: 'CUST-001',
        amount: 5000000,
        note: 'Tái điều trị: Chăm sóc định kỳ & đánh bóng sứ',
        occurredAt: '2026-11-05T16:00:00.000Z'
      },
      {
        id: 'VISIT-002-1',
        customerId: 'CUST-002',
        amount: 45000000,
        note: 'Gói đầu tiên: Niềng răng trong suốt Invisalign trọn gói',
        occurredAt: '2026-11-02T09:15:00.000Z'
      },
      {
        id: 'VISIT-003-1',
        customerId: 'CUST-003',
        amount: 4000000,
        note: 'Gói đầu tiên: Tẩy trắng răng Philips Zoom WhiteSpeed',
        occurredAt: '2026-11-03T10:00:00.000Z'
      },
      {
        id: 'VISIT-004-1',
        customerId: 'CUST-004',
        amount: 38000000,
        note: 'Gói đầu tiên: Cấy ghép 2 trụ Implant Straumann',
        occurredAt: '2026-11-04T11:00:00.000Z'
      },
      {
        id: 'VISIT-005-1',
        customerId: 'CUST-005',
        amount: 28000000,
        note: 'Gói đầu tiên: Chỉnh nha mắc cài sứ tự buộc',
        occurredAt: '2026-11-05T14:30:00.000Z'
      },
      {
        id: 'VISIT-006-1',
        customerId: 'CUST-006',
        amount: 20000000,
        note: 'Gói đầu tiên: Cấy ghép 1 trụ Implant Straumann',
        occurredAt: '2026-11-06T15:00:00.000Z'
      }
    ],
    settlements: [],
    referrals_archive: [],
    commissions_archive: []
  };
}

// BƯỚC 3: ARCHIVE DỮ LIỆU CŨ & MIGRATION
function runDataMigration(db) {
  let modified = false;
  const now = new Date().toISOString();

  // 3.1 Nếu database còn key referrals hoặc commissions -> đổi tên thành archive
  if (Array.isArray(db.referrals)) {
    if (!Array.isArray(db.referrals_archive)) {
      db.referrals_archive = [];
    }
    db.referrals.forEach(ref => {
      db.referrals_archive.push({
        ...ref,
        archivedAt: ref.archivedAt || now
      });
    });
    delete db.referrals;
    modified = true;
  }

  if (Array.isArray(db.commissions)) {
    if (!Array.isArray(db.commissions_archive)) {
      db.commissions_archive = [];
    }
    db.commissions.forEach(comm => {
      db.commissions_archive.push({
        ...comm,
        archivedAt: comm.archivedAt || now
      });
    });
    delete db.commissions;
    modified = true;
  }

  // 1. Partners depth
  if (Array.isArray(db.partners)) {
    const partnerMap = new Map(db.partners.map(p => [p.id, p]));
    function getDepth(id, visited = new Set()) {
      if (!id || visited.has(id)) return 0;
      visited.add(id);
      const p = partnerMap.get(id);
      if (!p || !p.parentId) return 0;
      return getDepth(p.parentId, visited) + 1;
    }
    db.partners.forEach(p => {
      const d = getDepth(p.id);
      if (p.depth !== d) {
        p.depth = d;
        modified = true;
      }
    });
  }

  // 2. Customers & Visits
  if (!Array.isArray(db.customers) || db.customers.length === 0) {
    const seed = getInitialSeed();
    db.customers = seed.customers;
    db.visits = seed.visits;
    modified = true;
  }

  if (!Array.isArray(db.visits)) {
    db.visits = [];
    modified = true;
  }

  // 3. Settlements
  if (!Array.isArray(db.settlements)) {
    db.settlements = [];
    modified = true;
  }

  return modified;
}

function initDatabase(forceReset = false) {
  if (!fs.existsSync(DB_FILE) || forceReset) {
    const initialSeed = getInitialSeed();
    saveDatabase(initialSeed);
    logAudit('INIT_DATABASE', 'SYSTEM', { message: 'Initialized database Plan v5 (Customer Depth + Branch Fee 1%)' });
  } else {
    // Migration kiểm tra tính toàn vẹn và archive
    const db = readDatabase();
    if (db && runDataMigration(db)) {
      saveDatabase(db);
      logAudit('MIGRATE_DATABASE', 'SYSTEM', { message: 'Migrated database and archived legacy tables successfully' });
    }
  }
}

function readDatabase() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      initDatabase(false);
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading database file:', e);
    return null;
  }
}

function saveDatabase(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('Error saving database file:', e);
    return false;
  }
}

function logAudit(action, entity, details, operator = 'Admin') {
  try {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      entity,
      operator,
      details
    };
    fs.appendFileSync(AUDIT_LOG_FILE, JSON.stringify(logEntry) + '\n', 'utf-8');
  } catch (e) {
    console.error('Error writing audit log:', e);
  }
}

// --------------------------------------------------------------------------
// API ENDPOINTS
// --------------------------------------------------------------------------

// 3.2 GET /api/data chỉ trả các bảng đang hoạt động:
// partners, services, customers, visits, settlements
// (archive không trả về mặc định; thêm ?includeArchive=1 nếu cần xem)
app.get('/api/data', (req, res) => {
  const db = readDatabase();
  const includeArchive = req.query.includeArchive === '1';

  const responseData = {
    partners: db.partners || [],
    services: db.services || [],
    customers: db.customers || [],
    visits: db.visits || [],
    settlements: db.settlements || []
  };

  if (includeArchive) {
    responseData.referrals_archive = db.referrals_archive || [];
    responseData.commissions_archive = db.commissions_archive || [];
  }

  res.json({
    success: true,
    data: responseData,
    server: {
      status: 'ONLINE',
      storage: 'PERSISTENT_FILE_LEDGER',
      path: DB_FILE
    }
  });
});

// 2. Quản lý Đối tác (Partners) - KHÔNG GIỚI HẠN SỐ TẦNG
// level @deprecated — dùng depth
app.post('/api/partners', (req, res) => {
  const partnerData = req.body;
  const db = readDatabase();

  // Kiểm tra chu kỳ / vòng lặp cha-con
  if (partnerData.parentId) {
    if (partnerData.id && partnerData.id === partnerData.parentId) {
      return res.status(400).json({ success: false, error: 'Đối tác không thể là cấp trên của chính mình.' });
    }
    const partnerMap = new Map(db.partners.map(p => [p.id, p]));
    let curr = partnerData.parentId;
    const visited = new Set();
    if (partnerData.id) visited.add(partnerData.id);

    while (curr) {
      if (visited.has(curr)) {
        return res.status(400).json({ success: false, error: 'Phát hiện vòng lặp phân cấp! Tuyến dưới không thể làm cấp trên.' });
      }
      visited.add(curr);
      const p = partnerMap.get(curr);
      if (!p) break;
      curr = p.parentId;
    }

    // Tự động gán depth
    const parent = partnerMap.get(partnerData.parentId);
    partnerData.depth = parent ? (parent.depth !== undefined ? parent.depth + 1 : 1) : 0;
  } else {
    partnerData.depth = 0;
  }

  // 4.2 level @deprecated — không set level khi tạo mới hoặc giữ null
  if (partnerData.level !== undefined) {
    partnerData.level = null;
  }

  const existingIndex = db.partners.findIndex(p => p.id === partnerData.id);
  if (existingIndex >= 0) {
    db.partners[existingIndex] = { ...db.partners[existingIndex], ...partnerData };
    logAudit('UPDATE_PARTNER', 'PARTNER', { id: partnerData.id, name: partnerData.name, depth: partnerData.depth });
  } else {
    db.partners.push(partnerData);
    logAudit('CREATE_PARTNER', 'PARTNER', { id: partnerData.id, name: partnerData.name, depth: partnerData.depth });
  }

  saveDatabase(db);
  res.json({ success: true, partner: partnerData });
});

app.post('/api/partners/:id/toggle-status', (req, res) => {
  const { id } = req.params;
  const db = readDatabase();
  const partner = db.partners.find(p => p.id === id);
  if (!partner) return res.status(404).json({ success: false, error: 'Partner not found' });

  partner.status = partner.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
  saveDatabase(db);
  logAudit('TOGGLE_STATUS', 'PARTNER', { id, status: partner.status });

  res.json({ success: true, partner });
});

// 3. Quản lý Khách hàng (Customers)
app.post('/api/customers', (req, res) => {
  const { customer, initialVisit } = req.body;
  const db = readDatabase();

  // Xác định depth và ownerPartnerId
  if (customer.referrerCustomerId) {
    const parentCustomer = db.customers.find(c => c.id === customer.referrerCustomerId);
    if (parentCustomer) {
      customer.depth = (parentCustomer.depth || 1) + 1;
      customer.ownerPartnerId = parentCustomer.ownerPartnerId; // Kế thừa từ khách giới thiệu
    } else {
      customer.depth = 1;
    }
  } else {
    customer.depth = 1;
  }

  const existingIndex = db.customers.findIndex(c => c.id === customer.id);
  if (existingIndex >= 0) {
    db.customers[existingIndex] = { ...db.customers[existingIndex], ...customer };
    logAudit('UPDATE_CUSTOMER', 'CUSTOMER', { id: customer.id, name: customer.name });
  } else {
    db.customers.unshift(customer);
    logAudit('CREATE_CUSTOMER', 'CUSTOMER', { id: customer.id, name: customer.name, depth: customer.depth });
  }

  // Nếu có visit ban đầu
  if (initialVisit && initialVisit.amount > 0) {
    const newVisit = {
      id: initialVisit.id || `VISIT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      customerId: customer.id,
      amount: Math.round(Number(initialVisit.amount) || 0),
      note: initialVisit.note || 'Gói điều trị ban đầu',
      occurredAt: initialVisit.occurredAt || new Date().toISOString()
    };
    db.visits.unshift(newVisit);
    logAudit('CREATE_VISIT', 'VISIT', { id: newVisit.id, customerId: customer.id, amount: newVisit.amount });
  }

  saveDatabase(db);
  res.json({ success: true, customer });
});

// 4. Quản lý Lượt điều trị / Tái khám ("+ Doanh thu")
app.post('/api/visits', (req, res) => {
  const visitData = req.body;
  const db = readDatabase();

  const visit = {
    id: visitData.id || `VISIT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    customerId: visitData.customerId,
    amount: Math.round(Number(visitData.amount) || 0),
    note: visitData.note || 'Tái điều trị',
    occurredAt: visitData.occurredAt || new Date().toISOString()
  };

  db.visits.unshift(visit);
  saveDatabase(db);
  logAudit('ADD_VISIT', 'VISIT', { id: visit.id, customerId: visit.customerId, amount: visit.amount, note: visit.note });

  res.json({ success: true, visit });
});

// --------------------------------------------------------------------------
// BƯỚC 1: 🔴 CHỐNG GIAN LẬN: SERVER TỰ TÍNH CHỐT SỔ
// --------------------------------------------------------------------------
app.post('/api/settlements', (req, res) => {
  const { month, force } = req.body || {};
  if (!/^\d{4}-\d{2}$/.test(month || '')) {
    return res.status(400).json({ success: false, error: 'Tháng không hợp lệ (YYYY-MM).' });
  }
  const db = readDatabase();
  const already = (db.settlements || []).some(s => s.month === month);
  if (already && !force) {
    return res.status(409).json({
      success: false,
      error: 'Kỳ này đã chốt sổ. Gửi force=true nếu muốn chốt lại.',
      requiresConfirm: true
    });
  }

  // SERVER TỰ TÍNH — không tin số client gửi
  const result = calculateMonthlySettlement(month, db);
  if (!result.partnerRows || !result.partnerRows.length) {
    return res.status(400).json({ success: false, error: 'Không có dữ liệu trong kỳ.' });
  }

  db.settlements = (db.settlements || []).filter(s => s.month !== month);
  const now = new Date().toISOString();
  for (const r of result.partnerRows) {
    db.settlements.push({
      id: `SETTLE-${month}-${r.partnerId}`,
      month,
      partnerId: r.partnerId,
      partnerCode: r.partnerCode,
      partnerName: r.partnerName,
      ownRevenue: r.ownRevenue,
      branchRevenue: r.branchRevenue,
      commission: r.commission,
      branchFee: r.branchFee,
      total: r.total,
      settledAt: now
    });
  }

  saveDatabase(db);
  logAudit('MONTHLY_SETTLEMENT', 'SETTLEMENT', {
    month, 
    partnersCount: result.partnerRows.length,
    totalCost: result.totalCost, 
    forced: Boolean(force), 
    settledAt: now
  });

  res.json({
    success: true,
    month,
    summary: {
      periodRevenue: result.periodRevenue,
      totalCtvCommission: result.totalCtvCommission,
      totalPlatformShare: result.totalPlatformShare,
      totalBranchFee: result.totalBranchFee,
      totalCost: result.totalCost,
      costPercent: result.costPercent,
      totalCredit: result.totalCredit
    },
    settlements: db.settlements.filter(s => s.month === month)
  });
});

// 6. API Quản lý Gói dịch vụ điều trị (Services)
app.post('/api/services', (req, res) => {
  const service = req.body;
  if (!service || !service.name || typeof service.defaultPrice !== 'number' || service.defaultPrice < 0) {
    return res.status(400).json({ success: false, error: 'Tên gói và đơn giá (>= 0) không hợp lệ.' });
  }

  const db = readDatabase();
  db.services = db.services || [];

  const existingIndex = db.services.findIndex(s => s.id === service.id);
  let savedService;

  if (existingIndex >= 0) {
    db.services[existingIndex] = {
      ...db.services[existingIndex],
      name: service.name.trim(),
      defaultPrice: service.defaultPrice,
      description: service.description ? service.description.trim() : (db.services[existingIndex].description || '')
    };
    savedService = db.services[existingIndex];
  } else {
    const nextNum = db.services.length + 1;
    const newId = service.id || `S${nextNum}`;
    savedService = {
      id: newId,
      name: service.name.trim(),
      defaultPrice: service.defaultPrice,
      description: service.description ? service.description.trim() : ''
    };
    db.services.push(savedService);
  }

  saveDatabase(db);
  logAudit('SERVICE_SAVED', 'SERVICE', {
    serviceId: savedService.id,
    name: savedService.name,
    defaultPrice: savedService.defaultPrice
  });

  res.json({ success: true, service: savedService, services: db.services });
});

app.delete('/api/services/:id', (req, res) => {
  const { id } = req.params;
  const db = readDatabase();
  const beforeCount = (db.services || []).length;
  db.services = (db.services || []).filter(s => s.id !== id);

  saveDatabase(db);
  logAudit('SERVICE_DELETED', 'SERVICE', { serviceId: id });

  res.json({ success: true, deleted: beforeCount !== db.services.length, services: db.services });
});

// 7. API Đặt lại dữ liệu mẫu Plan v5
app.post('/api/reset-data', (req, res) => {
  initDatabase(true);
  const db = readDatabase();
  logAudit('RESET_DATA', 'SYSTEM', { message: 'Database reset to Plan v5 default seed' });
  res.json({ success: true, data: db });
});

// 7. API Lấy audit logs
app.get('/api/audit-logs', (req, res) => {
  try {
    if (!fs.existsSync(AUDIT_LOG_FILE)) {
      return res.json({ success: true, logs: [] });
    }
    const lines = fs.readFileSync(AUDIT_LOG_FILE, 'utf-8').trim().split('\n').filter(Boolean);
    const logs = lines.map(line => JSON.parse(line)).reverse().slice(0, 50);
    res.json({ success: true, logs });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Khởi tạo không xóa dữ liệu
initDatabase(false);

app.listen(PORT, () => {
  console.log(`[DentalCRM Server] Running on http://localhost:${PORT}`);
  console.log(`[DentalCRM Server] Persistent Database: ${DB_FILE}`);
  console.log(`[DentalCRM Server] Audit Log: ${AUDIT_LOG_FILE}`);
});

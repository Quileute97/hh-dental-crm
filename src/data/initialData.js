/**
 * DENTAL CRM - DỮ LIỆU MẪU BAN ĐẦU (PLAN V5)
 * Hỗ trợ 2 hệ thống độc lập:
 * 1. Chuỗi khách hàng (Customers & Visits trọn đời)
 * 2. Cây đối tác không giới hạn độ sâu (Partners & Phí nhánh 1%)
 */

export const INITIAL_PARTNERS = [
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
];

export const INITIAL_SERVICES = [
  { id: 'S1', name: 'Cấy ghép Implant Straumann (Thuỵ Sĩ)', defaultPrice: 20000000 },
  { id: 'S2', name: 'Niềng răng trong suốt Invisalign', defaultPrice: 45000000 },
  { id: 'S3', name: 'Bọc răng sứ thẩm mỹ Cercon HT (16 răng)', defaultPrice: 32000000 },
  { id: 'S4', name: 'Tẩy trắng răng Philips Zoom WhiteSpeed', defaultPrice: 4000000 },
  { id: 'S5', name: 'Nhổ răng khôn không đau Piezotome', defaultPrice: 2500000 },
  { id: 'S6', name: 'Chỉnh nha mắc cài sứ tự buộc', defaultPrice: 28000000 },
];

/**
 * BẢNG CUSTOMERS MẪU (CHUỖI KHÁCH HÀNG ĐỘ SÂU THEO PLAN V5)
 * Dữ liệu chuẩn test khớp 172.000.000 VNĐ trong kỳ tháng 2026-11
 */
export const INITIAL_CUSTOMERS = [
  {
    id: 'CUST-001',
    code: 'KH-2026-0001',
    name: 'Hoàng Thị E',
    phone: '0912 999 888',
    ownerPartnerId: 'P1', // Thuộc P1
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
    ownerPartnerId: 'P1', // Kế thừa từ KH-01
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
    ownerPartnerId: 'P1', // Kế thừa từ KH-01
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
    ownerPartnerId: 'P2', // Thuộc P2
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
    ownerPartnerId: 'P2', // Kế thừa từ KH-04
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
    ownerPartnerId: 'P3', // Thuộc P3
    referrerCustomerId: null,
    depth: 1,
    treatment: 'Cấy ghép Implant Straumann (Thuỵ Sĩ)',
    status: 'completed',
    createdAt: '2026-11-06T15:00:00.000Z'
  }
];

/**
 * BẢNG VISITS MẪU (LƯỢT ĐIỀU TRỊ & DOANH THU TRỌN ĐỜI)
 * Khớp chuẩn tổng 172.000.000 VNĐ trong kỳ tháng 2026-11
 */
export const INITIAL_VISITS = [
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
];

export const INITIAL_SETTLEMENTS = [];

// Dữ liệu cũ giữ lại lưu trữ để không xóa dữ liệu
export const INITIAL_REFERRALS = [
  {
    id: 'REF-2026-001',
    patientName: 'Hoàng Thị E',
    patientPhone: '0912 999 888',
    serviceName: 'Bọc răng sứ thẩm mỹ Cercon HT (16 răng)',
    revenue: 37000000,
    directPartnerId: 'P1',
    status: 'COMPLETED',
    notes: 'Khách hàng thẩm mỹ nụ cười, hài lòng cao.',
    createdAt: '2026-11-01T08:30:00.000Z',
    completedAt: '2026-11-05T16:00:00.000Z',
    commissionsCalculated: true,
  }
];

export const INITIAL_COMMISSIONS = [];

/**
 * Migration helper: Đảm bảo dữ liệu cũ chuyển đổi sang Plan v5 đầy đủ và an toàn
 */
export function migrateDatabase(db = {}) {
  const result = { ...db };

  // 1. Partners
  if (!Array.isArray(result.partners) || result.partners.length === 0) {
    result.partners = INITIAL_PARTNERS;
  } else {
    // Tính lại depth
    const partnerMap = new Map(result.partners.map(p => [p.id, { ...p }]));
    function getDepth(id, visited = new Set()) {
      if (!id || visited.has(id)) return 0;
      visited.add(id);
      const p = partnerMap.get(id);
      if (!p || !p.parentId) return 0;
      return getDepth(p.parentId, visited) + 1;
    }
    result.partners = result.partners.map(p => ({
      ...p,
      depth: p.depth !== undefined ? p.depth : getDepth(p.id)
    }));
  }

  // 2. Services
  if (!Array.isArray(result.services) || result.services.length === 0) {
    result.services = INITIAL_SERVICES;
  }

  // 3. Customers
  if (!Array.isArray(result.customers) || result.customers.length === 0) {
    result.customers = INITIAL_CUSTOMERS;
  }

  // 4. Visits
  if (!Array.isArray(result.visits) || result.visits.length === 0) {
    result.visits = INITIAL_VISITS;
  }

  // 5. Settlements
  if (!Array.isArray(result.settlements)) {
    result.settlements = [];
  }

  // BƯỚC 3: ARCHIVE DỮ LIỆU CŨ
  const now = new Date().toISOString();
  if (Array.isArray(result.referrals)) {
    if (!Array.isArray(result.referrals_archive)) {
      result.referrals_archive = [];
    }
    result.referrals.forEach(r => {
      result.referrals_archive.push({ ...r, archivedAt: r.archivedAt || now });
    });
    delete result.referrals;
  }
  if (Array.isArray(result.commissions)) {
    if (!Array.isArray(result.commissions_archive)) {
      result.commissions_archive = [];
    }
    result.commissions.forEach(c => {
      result.commissions_archive.push({ ...c, archivedAt: c.archivedAt || now });
    });
    delete result.commissions;
  }

  return result;
}

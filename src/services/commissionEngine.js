/**
 * DENTAL CRM - PLAN V5 COMMISSION & BRANCH REVENUE ENGINE
 * 
 * TÁCH LÀM HAI HỆ THỐNG ĐỘC LẬP:
 * 
 * 1. HỆ THỐNG 1 — CHUỖI KHÁCH HÀNG (Customer Chain):
 *    - Hoa hồng tính theo ĐỘ SÂU CỦA KHÁCH (customer.depth), KHÔNG theo cấp bậc đối tác.
 *    - SÀN KHÔNG THU (Nền tảng 0%), toàn bộ hoa hồng hoàn về CTV giới thiệu ban đầu:
 *      + depth 1 (Trực tiếp): CTV hưởng 20%, Nền tảng 0%
 *      + depth 2 (Hạ tầng):   CTV hưởng 10%, Nền tảng 0%
 *      + depth 3..n (Tầng 3+): CTV hưởng 5%, Nền tảng 0%
 *    - Không giới hạn độ sâu. Không có trần hoa hồng.
 *    - Chủ sở hữu khách (CTV) = customer.ownerPartnerId (kế thừa từ khách giới thiệu ban đầu).
 * 
 * 2. HỆ THỐNG 2 — CÂY ĐỐI TÁC (Partner Tree):
 *    - Độ sâu đối tác (partner.depth): Gốc = 0, con = depth(cha) + 1. Không giới hạn số tầng.
 *    - Sổ khách (ownRevenue): Tổng doanh thu các visit của khách do đối tác sở hữu trong kỳ.
 *    - Doanh thu nhánh (branchRevenue): ownRevenue + tổng branchRevenue của toàn bộ cây con.
 *    - Phí nhánh 1% (branchFee): 1% × tổng branchRevenue của các CON TRỰC TIẾP.
 *      (Cấp trên nhận 1% từ cây của con trực tiếp, 1 đồng ở tầng sâu tạo ra nhiều khoản 1%).
 * 
 * 3. TỔNG CHI TRẢ ĐỐI TÁC TRONG KỲ:
 *    - total = commission (CTV) + branchFee (1% nhánh).
 *    - Mọi số tiền làm tròn Math.round, đơn vị VNĐ nguyên.
 */

/**
 * Hằng số chính sách hoa hồng & phí nhánh duy nhất của hệ thống
 */
export const COMMISSION_POLICY = {
  depth1: 20,
  depth2: 10,
  depth3Plus: 5,
  depth2Plus: 10, // Tương thích ngược với các thành phần cũ
  platform: 0,
  branchFee: 1
};

/**
 * Tỷ lệ hoa hồng CTV và phần Nền tảng theo độ sâu của khách hàng:
 * - Tầng 1 (Trực tiếp): 20%
 * - Tầng 2 (Hạ tầng):   10%
 * - Tầng 3 đến tầng n:  5%
 * @param {number} depth - Độ sâu của khách (1, 2, 3...)
 * @returns {{ ctvRate: number, platformRate: number }} Tỷ lệ %
 */
export function getCommissionRatesByCustomerDepth(depth) {
  const d = Math.max(1, parseInt(depth, 10) || 1);
  if (d <= 1) {
    return { ctvRate: COMMISSION_POLICY.depth1, platformRate: COMMISSION_POLICY.platform };
  }
  if (d === 2) {
    return { ctvRate: COMMISSION_POLICY.depth2, platformRate: COMMISSION_POLICY.platform };
  }
  // Tầng 3 đến tầng n: 5%
  return { ctvRate: COMMISSION_POLICY.depth3Plus, platformRate: COMMISSION_POLICY.platform };
}

/**
 * Tính độ sâu của khách hàng mới dựa trên khách giới thiệu
 * @param {string|null} referrerCustomerId - ID của khách hàng giới thiệu
 * @param {Array} customers - Danh sách khách hàng hiện có
 * @returns {number} Độ sâu của khách mới
 */
export function calculateCustomerDepth(referrerCustomerId, customers = []) {
  if (!referrerCustomerId) return 1;
  const referrer = customers.find(c => c.id === referrerCustomerId);
  if (!referrer) return 1;
  const parentDepth = parseInt(referrer.depth, 10) || 1;
  return parentDepth + 1;
}

/**
 * Tính toán lại depth cho tất cả đối tác dựa trên parentId
 * Gốc (parentId == null) -> depth = 0
 * Con -> depth = parent.depth + 1
 * @param {Array} partners 
 * @returns {Array} Danh sách đối tác kèm depth chuẩn xác
 */
export function calculatePartnerDepths(partners = []) {
  const partnerMap = new Map(partners.map(p => [p.id, { ...p }]));

  function getDepth(partnerId, visited = new Set()) {
    if (!partnerId) return 0;
    if (visited.has(partnerId)) return 0; // Chống vòng lặp
    visited.add(partnerId);

    const p = partnerMap.get(partnerId);
    if (!p || !p.parentId) return 0;
    return getDepth(p.parentId, visited) + 1;
  }

  return partners.map(p => ({
    ...p,
    depth: getDepth(p.id)
  }));
}

/**
 * Ràng buộc phân cấp an toàn: Chặn chu kỳ (vòng lặp cha-con)
 * BỎ MỌI GIỚI HẠN 5 TẦNG: Cho phép tạo tầng vô hạn (depth 4, 10, 50...)
 * @param {string|null} partnerId - ID đối tác đang chỉnh sửa (hoặc null nếu tạo mới)
 * @param {string|null} newParentId - ID cấp trên chỉ định
 * @param {Array} partners - Danh sách đối tác
 * @returns {{ isValid: boolean, error?: string }}
 */
export function validateParentAssignment(partnerId, newParentId, partners = []) {
  if (!newParentId) return { isValid: true };

  // Đối tác không thể làm cấp trên của chính mình
  if (partnerId && partnerId === newParentId) {
    return { isValid: false, error: 'Đối tác không thể là cấp trên của chính mình.' };
  }

  const partnerMap = new Map(partners.map(p => [p.id, p]));
  const parent = partnerMap.get(newParentId);
  if (!parent) return { isValid: true };

  // CHẶN VÒNG LẶP: Duyệt ngược chuỗi cha để phát hiện chu kỳ
  let currentId = newParentId;
  const visited = new Set();
  if (partnerId) visited.add(partnerId);

  while (currentId) {
    if (visited.has(currentId)) {
      return { isValid: false, error: 'Phát hiện vòng lặp phân cấp! Tuyến dưới không thể làm cấp trên.' };
    }
    visited.add(currentId);
    const p = partnerMap.get(currentId);
    if (!p) break;
    currentId = p.parentId;
  }

  return { isValid: true };
}

/**
 * Xây dựng cây phả hệ lồng nhau từ danh sách đối tác phẳng
 * Hỗ trợ độ sâu vô hạn, có trường children lồng nhau
 */
export function buildPartnerTree(partners = []) {
  const partnerMap = new Map();
  partners.forEach(p => {
    partnerMap.set(p.id, { ...p, children: [] });
  });

  const rootNodes = [];

  partnerMap.forEach(node => {
    if (node.parentId && partnerMap.has(node.parentId)) {
      partnerMap.get(node.parentId).children.push(node);
    } else {
      rootNodes.push(node);
    }
  });

  return rootNodes;
}

/**
 * TÍNH TOÁN TOÀN BỘ SỐ LIỆU THEO KỲ THÁNG M (YYYY-MM)
 * 
 * @param {string} monthStr - Tháng định dạng 'YYYY-MM' (VD: '2026-11')
 * @param {Object} data - { partners, customers, visits, settlements }
 * @returns {Object} Kết quả đối soát chi tiết
 */
export function calculateMonthlySettlement(monthStr, { partners = [], customers = [], visits = [], settlements = [] } = {}) {
  const partnerMap = new Map(partners.map(p => [p.id, p]));
  const customerMap = new Map(customers.map(c => [c.id, c]));

  // 1. Lọc các lượt điều trị (visits) phát sinh trong kỳ tháng M
  const periodVisits = visits.filter(v => {
    if (!v.occurredAt) return false;
    const vMonth = v.occurredAt.substring(0, 7);
    return vMonth === monthStr;
  });

  // 2. Tính toán hoa hồng từng visit và tích lũy vào Sổ khách (ownRevenue) + Hoa hồng CTV
  const ownRevenue = {};     // { [partnerId]: number }
  const ctvCommissions = {}; // { [partnerId]: number }
  let totalPeriodRevenue = 0;
  let totalCtvCommission = 0;
  let totalPlatformShare = 0;

  partners.forEach(p => {
    ownRevenue[p.id] = 0;
    ctvCommissions[p.id] = 0;
  });

  const visitBreakdowns = periodVisits.map(visit => {
    const amount = Math.round(Number(visit.amount) || 0);
    totalPeriodRevenue += amount;

    const customer = customerMap.get(visit.customerId) || {
      id: visit.customerId,
      name: 'Khách vãng lai',
      depth: 1,
      ownerPartnerId: null
    };

    const depth = Math.max(1, parseInt(customer.depth, 10) || 1);
    const { ctvRate, platformRate } = getCommissionRatesByCustomerDepth(depth);

    const ctvAmount = Math.round((amount * ctvRate) / 100);
    const platformAmount = Math.round((amount * platformRate) / 100);

    totalCtvCommission += ctvAmount;
    totalPlatformShare += platformAmount;

    const ownerId = customer.ownerPartnerId;
    if (ownerId && ownRevenue[ownerId] !== undefined) {
      ownRevenue[ownerId] += amount;
      ctvCommissions[ownerId] += ctvAmount;
    }

    return {
      visitId: visit.id,
      customerId: customer.id,
      customerName: customer.name,
      customerCode: customer.code,
      customerDepth: depth,
      ownerPartnerId: ownerId,
      ownerPartnerName: partnerMap.get(ownerId)?.name || 'N/A',
      amount,
      note: visit.note,
      occurredAt: visit.occurredAt,
      ctvRate,
      ctvAmount,
      platformRate,
      platformAmount
    };
  });

  // 3. Tính Doanh thu nhánh (branchRevenue) đệ quy toàn cây không giới hạn độ sâu
  // branchRevenue[partner] = ownRevenue[partner] + Σ branchRevenue[con trực tiếp]
  // Lập danh sách con trực tiếp cho mỗi đối tác
  const directChildrenMap = new Map();
  partners.forEach(p => {
    directChildrenMap.set(p.id, []);
  });
  partners.forEach(p => {
    if (p.parentId && directChildrenMap.has(p.parentId)) {
      directChildrenMap.get(p.parentId).push(p.id);
    }
  });

  const branchRevenue = {};
  const memo = new Map();

  function computeBranchRevenue(partnerId, visited = new Set()) {
    if (visited.has(partnerId)) return 0; // Chống vòng lặp
    if (memo.has(partnerId)) return memo.get(partnerId);

    visited.add(partnerId);
    const selfOwn = ownRevenue[partnerId] || 0;
    const childrenIds = directChildrenMap.get(partnerId) || [];

    let childrenBranchTotal = 0;
    for (const childId of childrenIds) {
      childrenBranchTotal += computeBranchRevenue(childId, new Set(visited));
    }

    const total = selfOwn + childrenBranchTotal;
    memo.set(partnerId, total);
    return total;
  }

  partners.forEach(p => {
    branchRevenue[p.id] = computeBranchRevenue(p.id);
  });

  // 4. Tính Phí nhánh 1% (branchFee):
  // branchFee[partner] = 1% × Σ branchRevenue[các đối tác CON TRỰC TIẾP]
  const branchFees = {};
  let totalBranchFee = 0;

  partners.forEach(p => {
    const childrenIds = directChildrenMap.get(p.id) || [];
    let childrenBranchSum = 0;
    for (const childId of childrenIds) {
      childrenBranchSum += (branchRevenue[childId] || 0);
    }
    const fee = Math.round(childrenBranchSum * 0.01);
    branchFees[p.id] = fee;
    totalBranchFee += fee;
  });

  // 5. Tổng chi phí / Doanh thu
  // Tổng chi phí = Tổng hoa hồng CTV + Phần nền tảng + Tổng phí nhánh 1%
  const totalCost = totalCtvCommission + totalPlatformShare + totalBranchFee;
  const costPercent = totalPeriodRevenue > 0
    ? Math.round((totalCost / totalPeriodRevenue) * 1000) / 10 // 1 số lẻ (VD: 16.1)
    : 0;

  // 6. Kiểm tra trạng thái đã chốt sổ trong bảng settlements
  const settlementMap = new Map();
  settlements.forEach(s => {
    if (s.month === monthStr) {
      settlementMap.set(s.partnerId, s);
    }
  });

  // Tính credit tích lũy cho từng khách hàng và đối tác sở hữu
  const customerCreditMap = new Map();
  customers.forEach(c => {
    customerCreditMap.set(c.id, calculateCustomerCredit(customers, c.id));
  });

  let totalSystemCredit = 0;
  const partnerCreditMap = new Map();
  partners.forEach(p => partnerCreditMap.set(p.id, 0));

  customers.forEach(c => {
    const cred = customerCreditMap.get(c.id) || 0;
    if (c.ownerPartnerId && partnerCreditMap.has(c.ownerPartnerId)) {
      partnerCreditMap.set(c.ownerPartnerId, partnerCreditMap.get(c.ownerPartnerId) + cred);
    }
    totalSystemCredit += cred;
  });

  // 7. Bảng tổng hợp chi tiết từng đối tác
  const partnerRows = partners.map(p => {
    const parent = p.parentId ? partnerMap.get(p.parentId) : null;
    const own = ownRevenue[p.id] || 0;
    const branch = branchRevenue[p.id] || 0;
    const comm = ctvCommissions[p.id] || 0;
    const fee = branchFees[p.id] || 0;
    const total = comm + fee;
    const settledSnapshot = settlementMap.get(p.id);

    return {
      partnerId: p.id,
      partnerCode: p.code,
      partnerName: p.name,
      partnerTitle: p.title,
      parentId: p.parentId,
      parentName: parent ? `${parent.name} (${parent.code})` : '— (Gốc)',
      depth: p.depth !== undefined ? p.depth : 0,
      ownRevenue: own,
      branchRevenue: branch,
      commission: comm,
      branchFee: fee,
      total,
      totalCredit: partnerCreditMap.get(p.id) || 0,
      isSettled: Boolean(settledSnapshot),
      settledAt: settledSnapshot?.settledAt || null,
      bankName: p.bankName,
      bankAccountNo: p.bankAccountNo,
      bankAccountName: p.bankAccountName
    };
  });

  return {
    month: monthStr,
    periodRevenue: totalPeriodRevenue,
    totalCtvCommission,
    totalPlatformShare,
    totalBranchFee,
    totalCost,
    costPercent,
    totalCredit: totalSystemCredit,
    visitBreakdowns,
    partnerRows,
    settlementCount: settlementMap.size,
    isFullySettled: partners.length > 0 && settlementMap.size === partners.length
  };
}

export const CREDIT_ON_ARRIVED = 200000;
export const CREDIT_ON_COMPLETED = 500000;

/** Credit mà một khách nhận được với vai trò người giới thiệu (suy ra từ trạng thái của khách con) */
export function calculateCustomerCredit(customers = [], customerId) {
  return customers
    .filter(c => c.referrerCustomerId === customerId)
    .reduce((sum, c) => {
      if (c.status === 'completed') return sum + CREDIT_ON_COMPLETED;
      if (c.status === 'arrived') return sum + CREDIT_ON_ARRIVED;
      return sum;
    }, 0);
}


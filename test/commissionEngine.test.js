import {
  calculateMonthlySettlement,
  getCommissionRatesByCustomerDepth,
  calculatePartnerDepths,
  validateParentAssignment
} from '../src/services/commissionEngine.js';

function assert(condition, message) {
  if (!condition) {
    console.error('❌ FAIL:', message);
    process.exit(1);
  } else {
    console.log('✅ PASS:', message);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    console.error(`❌ FAIL: ${message} (Expected: ${expected}, Got: ${actual})`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message} = ${actual}`);
  }
}

console.log('====================================================');
console.log('CHẠY BỘ TEST KIỂM THỬ BẮT BUỘC (PLAN V5)');
console.log('====================================================\n');

// ----------------------------------------------------
// KIỂM THỬ 1: 3 đối tác P1 -> P2 -> P3, 6 khách hàng
// ----------------------------------------------------
console.log('--- KIỂM THỬ 1: BỘ SỐ LIỆU CHUẨN 172.000.000 VNĐ ---');

const partnersTest1 = [
  { id: 'P1', code: 'REF-P1', name: 'Đối tác P1', parentId: null, depth: 0 },
  { id: 'P2', code: 'REF-P2', name: 'Đối tác P2', parentId: 'P1', depth: 1 },
  { id: 'P3', code: 'REF-P3', name: 'Đối tác P3', parentId: 'P2', depth: 2 },
];

const customersTest1 = [
  // KH-01 P1, không referrer, 32.000.000 (+ tái điều trị 5.000.000)
  { id: 'C1', code: 'KH-01', name: 'KH-01', ownerPartnerId: 'P1', referrerCustomerId: null, depth: 1 },
  // KH-02 P1, referrer KH-01, 45.000.000
  { id: 'C2', code: 'KH-02', name: 'KH-02', ownerPartnerId: 'P1', referrerCustomerId: 'C1', depth: 2 },
  // KH-03 P1, referrer KH-01, 4.000.000
  { id: 'C3', code: 'KH-03', name: 'KH-03', ownerPartnerId: 'P1', referrerCustomerId: 'C1', depth: 2 },
  // KH-04 P2, không referrer, 38.000.000
  { id: 'C4', code: 'KH-04', name: 'KH-04', ownerPartnerId: 'P2', referrerCustomerId: null, depth: 1 },
  // KH-05 P2, referrer KH-04, 28.000.000
  { id: 'C5', code: 'KH-05', name: 'KH-05', ownerPartnerId: 'P2', referrerCustomerId: 'C4', depth: 2 },
  // KH-06 P3, không referrer, 20.000.000
  { id: 'C6', code: 'KH-06', name: 'KH-06', ownerPartnerId: 'P3', referrerCustomerId: null, depth: 1 },
];

const visitsTest1 = [
  { id: 'V1_1', customerId: 'C1', amount: 32000000, note: 'Gói đầu tiên', occurredAt: '2026-11-01T10:00:00Z' },
  { id: 'V1_2', customerId: 'C1', amount: 5000000, note: 'Tái điều trị', occurredAt: '2026-11-05T10:00:00Z' },
  { id: 'V2', customerId: 'C2', amount: 45000000, note: 'Gói đầu tiên', occurredAt: '2026-11-02T10:00:00Z' },
  { id: 'V3', customerId: 'C3', amount: 4000000, note: 'Gói đầu tiên', occurredAt: '2026-11-03T10:00:00Z' },
  { id: 'V4', customerId: 'C4', amount: 38000000, note: 'Gói đầu tiên', occurredAt: '2026-11-04T10:00:00Z' },
  { id: 'V5', customerId: 'C5', amount: 28000000, note: 'Gói đầu tiên', occurredAt: '2026-11-06T10:00:00Z' },
  { id: 'V6', customerId: 'C6', amount: 20000000, note: 'Gói đầu tiên', occurredAt: '2026-11-07T10:00:00Z' },
];

const res1 = calculateMonthlySettlement('2026-11', {
  partners: partnersTest1,
  customers: customersTest1,
  visits: visitsTest1,
  settlements: []
});

const p1Row = res1.partnerRows.find(r => r.partnerId === 'P1');
const p2Row = res1.partnerRows.find(r => r.partnerId === 'P2');
const p3Row = res1.partnerRows.find(r => r.partnerId === 'P3');

assertEqual(res1.periodRevenue, 172000000, 'Doanh thu kỳ');
assertEqual(p1Row.ownRevenue, 86000000, 'Sổ khách P1');
assertEqual(p2Row.ownRevenue, 66000000, 'Sổ khách P2');
assertEqual(p3Row.ownRevenue, 20000000, 'Sổ khách P3');

assertEqual(p1Row.branchRevenue, 172000000, 'Doanh thu nhánh P1');
assertEqual(p2Row.branchRevenue, 86000000, 'Doanh thu nhánh P2');
assertEqual(p3Row.branchRevenue, 20000000, 'Doanh thu nhánh P3');

assertEqual(p1Row.commission, 8380000, 'Hoa hồng P1 (20%×37tr + 2%×49tr)');
assertEqual(p2Row.commission, 8160000, 'Hoa hồng P2 (20%×38tr + 2%×28tr)');
assertEqual(p3Row.commission, 4000000, 'Hoa hồng P3 (20%×20tr)');
assertEqual(res1.totalCtvCommission, 20540000, 'Tổng hoa hồng CTV');

assertEqual(res1.totalPlatformShare, 6160000, 'Phần nền tảng (8%×77tr)');

assertEqual(p1Row.branchFee, 860000, 'Phí nhánh P1 (1% × nhánh P2)');
assertEqual(p2Row.branchFee, 200000, 'Phí nhánh P2 (1% × nhánh P3)');
assertEqual(p3Row.branchFee, 0, 'Phí nhánh P3');

assertEqual(res1.totalCost, 27760000, 'Tổng chi phí');
assertEqual(res1.costPercent, 16.1, 'Tổng chi phí / doanh thu % (16.1%)');

console.log('\n----------------------------------------------------');
console.log('--- KIỂM THỬ 2: KHÔNG GIỚI HẠN TẦNG (P1 -> P2 -> P3 -> P4) ---');
console.log('----------------------------------------------------');
// Thêm P4 với parentId = P3, thêm khách 10.000.000 cho P4.
// → P3 nhận phí 100.000; P2 nhận thêm 100.000; P1 nhận thêm 100.000.
// → Chứng minh một đồng ở tầng 4 tạo ra 3 khoản 1%. Đây là hành vi ĐÚNG.

const partnersTest2 = [
  ...partnersTest1,
  { id: 'P4', code: 'REF-P4', name: 'Đối tác P4', parentId: 'P3', depth: 3 }
];

const customersTest2 = [
  ...customersTest1,
  { id: 'C7', code: 'KH-07', name: 'KH-07', ownerPartnerId: 'P4', referrerCustomerId: null, depth: 1 }
];

const visitsTest2 = [
  ...visitsTest1,
  { id: 'V7', customerId: 'C7', amount: 10000000, note: 'Gói đầu tiên', occurredAt: '2026-11-08T10:00:00Z' }
];

const res2 = calculateMonthlySettlement('2026-11', {
  partners: partnersTest2,
  customers: customersTest2,
  visits: visitsTest2,
  settlements: []
});

const p1Row2 = res2.partnerRows.find(r => r.partnerId === 'P1');
const p2Row2 = res2.partnerRows.find(r => r.partnerId === 'P2');
const p3Row2 = res2.partnerRows.find(r => r.partnerId === 'P3');
const p4Row2 = res2.partnerRows.find(r => r.partnerId === 'P4');

assertEqual(p3Row2.branchFee, 100000, 'P3 nhận phí 100.000 (1% của nhánh P4 10tr)');
assertEqual(p2Row2.branchFee, 300000, 'P2 nhận thêm 100.000 (tổng 300.000: 1% của nhánh P3 30tr)');
assertEqual(p1Row2.branchFee, 960000, 'P1 nhận thêm 100.000 (tổng 960.000: 1% của nhánh P2 96tr)');

console.log('\n----------------------------------------------------');
console.log('--- KIỂM THỬ 3: KHÔNG CHẶN TẠO TẦNG SÂU (DEPTH 4, 10, 50...) ---');
console.log('----------------------------------------------------');

const partnersDeep = [
  { id: 'P0', parentId: null, depth: 0 },
  { id: 'P10', parentId: 'P0', depth: 10 },
  { id: 'P50', parentId: 'P10', depth: 50 },
];

const validNewChild = validateParentAssignment(null, 'P50', partnersDeep);
assert(validNewChild.isValid === true, 'Tạo đối tác con dưới đối tác depth 50 thành công, không bị lỗi');

// Chặn vòng lặp cha con
const cyclicAssignment = validateParentAssignment('P0', 'P50', partnersDeep);
assert(cyclicAssignment.isValid === false, 'Phát hiện và chặn đúng vòng lặp phân cấp khi gán P0 có cha là P50');

console.log('\n🎉 TẤT CẢ CÁC KIỂM THỬ BẮT BUỘC ĐỀU ĐÃ ĐẠT CHUẨN XÁC 100%!\n');


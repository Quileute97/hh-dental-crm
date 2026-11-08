import {
  calculateMonthlySettlement,
  calculateCustomerCredit,
  CREDIT_ON_ARRIVED,
  CREDIT_ON_COMPLETED
} from '../src/services/commissionEngine.js';
import fs from 'fs';
import path from 'path';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
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
console.log('CHẠY BỘ KIỂM THỬ TỰ ĐỘNG PLAN V5 (tests/settlement.test.mjs)');
console.log('====================================================\n');

// ----------------------------------------------------
// TEST 1 — BỘ SỐ LIỆU CHUẨN 172.000.000 VNĐ
// ----------------------------------------------------
console.log('--- TEST 1: KIỂM TRA SỐ LIỆU TÍNH TOÁN KỲ 2026-11 ---');

const partnersTest1 = [
  { id: 'P1', code: 'REF-P1', name: 'Đối tác P1', parentId: null, depth: 0 },
  { id: 'P2', code: 'REF-P2', name: 'Đối tác P2', parentId: 'P1', depth: 1 },
  { id: 'P3', code: 'REF-P3', name: 'Đối tác P3', parentId: 'P2', depth: 2 },
];

const customersTest1 = [
  { id: 'c1', code: 'KH-01', name: 'c1', ownerPartnerId: 'P1', referrerCustomerId: null, depth: 1, status: 'completed' },
  { id: 'c2', code: 'KH-02', name: 'c2', ownerPartnerId: 'P1', referrerCustomerId: 'c1', depth: 2, status: 'completed' },
  { id: 'c3', code: 'KH-03', name: 'c3', ownerPartnerId: 'P1', referrerCustomerId: 'c1', depth: 2, status: 'completed' },
  { id: 'c4', code: 'KH-04', name: 'c4', ownerPartnerId: 'P2', referrerCustomerId: null, depth: 1, status: 'completed' },
  { id: 'c5', code: 'KH-05', name: 'c5', ownerPartnerId: 'P2', referrerCustomerId: 'c4', depth: 2, status: 'completed' },
  { id: 'c6', code: 'KH-06', name: 'c6', ownerPartnerId: 'P3', referrerCustomerId: null, depth: 1, status: 'completed' },
];

const visitsTest1 = [
  { id: 'v1_1', customerId: 'c1', amount: 32000000, note: 'Gói đầu tiên', occurredAt: '2026-11-05T10:00:00Z' },
  { id: 'v1_2', customerId: 'c1', amount: 5000000, note: 'Tái điều trị', occurredAt: '2026-11-05T15:00:00Z' },
  { id: 'v2', customerId: 'c2', amount: 45000000, note: 'Gói đầu tiên', occurredAt: '2026-11-05T10:00:00Z' },
  { id: 'v3', customerId: 'c3', amount: 4000000, note: 'Gói đầu tiên', occurredAt: '2026-11-05T10:00:00Z' },
  { id: 'v4', customerId: 'c4', amount: 38000000, note: 'Gói đầu tiên', occurredAt: '2026-11-05T10:00:00Z' },
  { id: 'v5', customerId: 'c5', amount: 28000000, note: 'Gói đầu tiên', occurredAt: '2026-11-05T10:00:00Z' },
  { id: 'v6', customerId: 'c6', amount: 20000000, note: 'Gói đầu tiên', occurredAt: '2026-11-05T10:00:00Z' },
];

const res1 = calculateMonthlySettlement('2026-11', {
  partners: partnersTest1,
  customers: customersTest1,
  visits: visitsTest1,
  settlements: []
});

const p1 = res1.partnerRows.find(r => r.partnerId === 'P1');
const p2 = res1.partnerRows.find(r => r.partnerId === 'P2');
const p3 = res1.partnerRows.find(r => r.partnerId === 'P3');

assertEqual(res1.periodRevenue, 172000000, 'periodRevenue');
assertEqual(res1.totalCtvCommission, 20540000, 'totalCtvCommission (T1: 20%, T2+: 2%)');
assertEqual(res1.totalPlatformShare, 0, 'totalPlatformShare (Sàn không thu = 0)');
assertEqual(res1.totalBranchFee, 1060000, 'totalBranchFee');
assertEqual(res1.totalCost, 21600000, 'totalCost');
assertEqual(res1.costPercent, 12.6, 'costPercent');

assertEqual(p1.ownRevenue, 86000000, 'P1 ownRevenue');
assertEqual(p1.branchRevenue, 172000000, 'P1 branchRevenue');
assertEqual(p1.commission, 8380000, 'P1 commission (20%×37tr + 2%×49tr)');
assertEqual(p1.branchFee, 860000, 'P1 branchFee');

assertEqual(p2.ownRevenue, 66000000, 'P2 ownRevenue');
assertEqual(p2.branchRevenue, 86000000, 'P2 branchRevenue');
assertEqual(p2.commission, 8160000, 'P2 commission (20%×38tr + 2%×28tr)');
assertEqual(p2.branchFee, 200000, 'P2 branchFee');

assertEqual(p3.ownRevenue, 20000000, 'P3 ownRevenue');
assertEqual(p3.branchRevenue, 20000000, 'P3 branchRevenue');
assertEqual(p3.commission, 4000000, 'P3 commission (20%×20tr)');
assertEqual(p3.branchFee, 0, 'P3 branchFee');

// ----------------------------------------------------
// TEST 2 — CỘNG DỒN TẦNG SÂU (P1 -> P2 -> P3 -> P4)
// ----------------------------------------------------
console.log('\n--- TEST 2: CỘNG DỒN TẦNG SÂU ---');
const partnersTest2 = [
  ...partnersTest1,
  { id: 'P4', code: 'REF-P4', name: 'Đối tác P4', parentId: 'P3', depth: 3 }
];
const customersTest2 = [
  ...customersTest1,
  { id: 'c7', code: 'KH-07', name: 'c7', ownerPartnerId: 'P4', referrerCustomerId: null, depth: 1 }
];
const visitsTest2 = [
  ...visitsTest1,
  { id: 'v7', customerId: 'c7', amount: 10000000, note: 'Gói đầu tiên', occurredAt: '2026-11-05T10:00:00Z' }
];

const res2 = calculateMonthlySettlement('2026-11', {
  partners: partnersTest2,
  customers: customersTest2,
  visits: visitsTest2,
  settlements: []
});

const p1_2 = res2.partnerRows.find(r => r.partnerId === 'P1');
const p2_2 = res2.partnerRows.find(r => r.partnerId === 'P2');
const p3_2 = res2.partnerRows.find(r => r.partnerId === 'P3');

assertEqual(p3_2.branchFee, 100000, 'P3 branchFee (+100.000)');
assertEqual(p2_2.branchFee, 300000, 'P2 branchFee (+100.000)');
assertEqual(p1_2.branchFee, 960000, 'P1 branchFee (+100.000)');

// ----------------------------------------------------
// TEST 2.1 — KIỂM THỬ ĐỘ SÂU KHÁCH HÀNG: TẦNG 1 (20%), TẦNG 2+ HẠ TẦNG (2%)
// ----------------------------------------------------
console.log('\n--- TEST 2.1: TỶ LỆ HOA HỒNG TẦNG 1 (20%), TẦNG 2+ (2%) ---');
const depthTestCustomers = [
  { id: 'cd1', ownerPartnerId: 'P1', depth: 1 },
  { id: 'cd2', ownerPartnerId: 'P1', depth: 2 },
  { id: 'cd3', ownerPartnerId: 'P1', depth: 3 },
  { id: 'cd4', ownerPartnerId: 'P1', depth: 4 },
  { id: 'cd10', ownerPartnerId: 'P1', depth: 10 },
];
const depthTestVisits = [
  { id: 'vd1', customerId: 'cd1', amount: 10000000, occurredAt: '2026-11-01T00:00:00Z' }, // 10tr * 20% = 2.000.000
  { id: 'vd2', customerId: 'cd2', amount: 10000000, occurredAt: '2026-11-01T00:00:00Z' }, // 10tr * 2%  = 200.000
  { id: 'vd3', customerId: 'cd3', amount: 10000000, occurredAt: '2026-11-01T00:00:00Z' }, // 10tr * 2%  = 200.000
  { id: 'vd4', customerId: 'cd4', amount: 20000000, occurredAt: '2026-11-01T00:00:00Z' }, // 20tr * 2%  = 400.000
  { id: 'vd10', customerId: 'cd10', amount: 10000000, occurredAt: '2026-11-01T00:00:00Z' }, // 10tr * 2% = 200.000
];
const depthRes = calculateMonthlySettlement('2026-11', {
  partners: [{ id: 'P1', code: 'REF-P1', name: 'P1', parentId: null, depth: 0 }],
  customers: depthTestCustomers,
  visits: depthTestVisits,
  settlements: []
});
const p1Depth = depthRes.partnerRows[0];
assertEqual(depthRes.visitBreakdowns.find(v => v.visitId === 'vd1').ctvRate, 20, 'Tầng 1 -> ctvRate = 20%');
assertEqual(depthRes.visitBreakdowns.find(v => v.visitId === 'vd1').ctvAmount, 2000000, 'Tầng 1 -> ctvAmount = 2.000.000 ₫');
assertEqual(depthRes.visitBreakdowns.find(v => v.visitId === 'vd2').ctvRate, 2, 'Tầng 2 -> ctvRate = 2%');
assertEqual(depthRes.visitBreakdowns.find(v => v.visitId === 'vd2').ctvAmount, 200000, 'Tầng 2 -> ctvAmount = 200.000 ₫');
assertEqual(depthRes.visitBreakdowns.find(v => v.visitId === 'vd3').ctvRate, 2, 'Tầng 3 -> ctvRate = 2%');
assertEqual(depthRes.visitBreakdowns.find(v => v.visitId === 'vd3').ctvAmount, 200000, 'Tầng 3 -> ctvAmount = 200.000 ₫');
assertEqual(depthRes.visitBreakdowns.find(v => v.visitId === 'vd4').ctvRate, 2, 'Tầng 4 -> ctvRate = 2%');
assertEqual(depthRes.visitBreakdowns.find(v => v.visitId === 'vd4').ctvAmount, 400000, 'Tầng 4 -> ctvAmount = 400.000 ₫');
assertEqual(depthRes.visitBreakdowns.find(v => v.visitId === 'vd10').ctvRate, 2, 'Tầng 10 (tầng n) -> ctvRate = 2%');
assertEqual(depthRes.visitBreakdowns.find(v => v.visitId === 'vd10').ctvAmount, 200000, 'Tầng 10 -> ctvAmount = 200.000 ₫');
assertEqual(p1Depth.commission, 3000000, 'Tổng hoa hồng P1 từ cả 5 tầng = 3.000.000 ₫');

// ----------------------------------------------------
// TEST 3 & 4 — ĐỐI SOÁT VỚI GOLDEN BENCHMARK (172M VNĐ)
// ----------------------------------------------------
console.log('\n--- TEST 3 & 4: ĐỐI SOÁT CHUẨN XÁC VỚI GOLDEN BENCHMARK (scripts/golden.json) ---');

const goldenFilePath = path.join(process.cwd(), 'scripts', 'golden.json');
const seedDbPath = path.join(process.cwd(), 'scripts', 'seed_database.json');

assert(fs.existsSync(goldenFilePath), 'Tệp chuẩn scripts/golden.json tồn tại');
assert(fs.existsSync(seedDbPath), 'Tệp dữ liệu gốc scripts/seed_database.json tồn tại');

const golden = JSON.parse(fs.readFileSync(goldenFilePath, 'utf-8'));
const seedDb = JSON.parse(fs.readFileSync(seedDbPath, 'utf-8'));

const testRunResult = calculateMonthlySettlement(golden.month, seedDb);

assertEqual(testRunResult.periodRevenue, golden.periodRevenue, `Doanh thu toàn hệ thống khớp chuẩn: ${golden.periodRevenue.toLocaleString('vi-VN')} ₫`);
assertEqual(testRunResult.totalCtvCommission, golden.totalCtvCommission, `Tổng hoa hồng CTV khớp chuẩn: ${golden.totalCtvCommission.toLocaleString('vi-VN')} ₫`);
assertEqual(testRunResult.totalBranchFee, golden.totalBranchFee, `Tổng phí nhánh 1% khớp chuẩn: ${golden.totalBranchFee.toLocaleString('vi-VN')} ₫`);
assertEqual(testRunResult.totalCost, golden.totalCost, `Tổng chi phí hệ thống khớp chuẩn: ${golden.totalCost.toLocaleString('vi-VN')} ₫`);
assertEqual(testRunResult.costPercent, golden.costPercent, `Tỷ lệ chi phí hệ thống: ${golden.costPercent}%`);

// Đối soát từng đối tác P1, P2, P3
for (const goldenPartner of golden.partnerRows) {
  const testedPartner = testRunResult.partnerRows.find(p => p.partnerId === goldenPartner.partnerId);
  assert(testedPartner !== undefined, `Đối tác ${goldenPartner.partnerId} có trong kết quả tính toán`);
  assertEqual(testedPartner.ownRevenue, goldenPartner.ownRevenue, `Doanh thu trực tiếp ${goldenPartner.partnerId}`);
  assertEqual(testedPartner.branchRevenue, goldenPartner.branchRevenue, `Doanh thu nhánh ${goldenPartner.partnerId}`);
  assertEqual(testedPartner.commission, goldenPartner.commission, `Hoa hồng CTV ${goldenPartner.partnerId}`);
  assertEqual(testedPartner.branchFee, goldenPartner.branchFee, `Phí nhánh 1% ${goldenPartner.partnerId}`);
  assertEqual(testedPartner.total, goldenPartner.total, `Tổng thu nhập ${goldenPartner.partnerId}`);
}

// ----------------------------------------------------
// TEST 5 — CREDIT CHO KHÁCH GIỚI THIỆU
// ----------------------------------------------------
console.log('\n--- TEST 5: CREDIT CHO KHÁCH GIỚI THIỆU (200k / 500k) ---');

const testCustomersCredit = [
  { id: 'X', name: 'Khách X', referrerCustomerId: null, status: 'completed' },
  { id: 'Y', name: 'Khách Y', referrerCustomerId: 'X', status: 'arrived' },
];

const creditArrived = calculateCustomerCredit(testCustomersCredit, 'X');
assertEqual(creditArrived, 200000, 'Y.status = arrived -> Credit(X) = 200.000 ₫');

testCustomersCredit[1].status = 'completed';
const creditCompleted = calculateCustomerCredit(testCustomersCredit, 'X');
assertEqual(creditCompleted, 500000, 'Y.status = completed -> Credit(X) = 500.000 ₫ (tổng, không cộng dồn)');

// KIỂM TRA KHẲNG ĐỊNH BƯỚC 4: ENGINE KHÔNG ĐỌC PARTNER.LEVEL
console.log('\n--- BƯỚC 4: KIỂM TRA ENGINE KHÔNG ĐỌC PARTNER.LEVEL ---');
const engineFilePath = path.join(process.cwd(), 'src', 'services', 'commissionEngine.js');
const engineCode = fs.readFileSync(engineFilePath, 'utf-8');
const hasLevelAccess = /\.level\b/.test(engineCode);
assert(!hasLevelAccess, 'Không còn bất kỳ truy cập partner.level nào trong commissionEngine.js');

console.log('\n🎉 TOÀN BỘ 5 BỘ TEST ĐÃ HOÀN THÀNH XUẤT SẮC 100% VỚI EXIT CODE 0!\n');


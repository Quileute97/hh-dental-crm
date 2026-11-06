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
assertEqual(res1.totalCtvCommission, 26700000, 'totalCtvCommission (Sàn không thu: toàn bộ hoàn về CTV ban đầu)');
assertEqual(res1.totalPlatformShare, 0, 'totalPlatformShare (Sàn không thu = 0)');
assertEqual(res1.totalBranchFee, 1060000, 'totalBranchFee');
assertEqual(res1.totalCost, 27760000, 'totalCost');
assertEqual(res1.costPercent, 16.1, 'costPercent');

assertEqual(p1.ownRevenue, 86000000, 'P1 ownRevenue');
assertEqual(p1.branchRevenue, 172000000, 'P1 branchRevenue');
assertEqual(p1.commission, 12300000, 'P1 commission (20%×37tr + 10%×49tr)');
assertEqual(p1.branchFee, 860000, 'P1 branchFee');

assertEqual(p2.ownRevenue, 66000000, 'P2 ownRevenue');
assertEqual(p2.branchRevenue, 86000000, 'P2 branchRevenue');
assertEqual(p2.commission, 10400000, 'P2 commission (20%×38tr + 10%×28tr)');
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
// TEST 3 — CHỐT SỔ HAI LẦN & TEST 4 — CHỐNG GIAN LẬN
// ----------------------------------------------------
console.log('\n--- TEST 3 & 4: API CHỐT SỔ, XÁC NHẬN CHỐT LẠI & CHỐNG GIAN LẬN ---');

const API_BASE = 'http://localhost:3001/api';

try {
  // Lần 1: Chốt sổ tháng test '2026-12' lần đầu với force=true để đảm bảo reset
  const initRes = await fetch(`${API_BASE}/settlements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ month: '2026-12', force: true })
  });
  assert(initRes.status === 200, 'Lần 1: POST /api/settlements kỳ 2026-12 thành công (HTTP 200)');

  // Lần 2: Chốt lại kỳ 2026-12 nhưng KHÔNG có force -> phải trả về 409 và requiresConfirm
  const secondRes = await fetch(`${API_BASE}/settlements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ month: '2026-12' })
  });
  const secondJson = await secondRes.json();
  assertEqual(secondRes.status, 409, 'Lần 2: Chốt lại không force trả về HTTP 409');
  assert(secondJson.requiresConfirm === true, 'Response chứa requiresConfirm = true');

  // Lần 3: Chốt lại với force=true -> phải trả về 200 ghi đè thành công
  const thirdRes = await fetch(`${API_BASE}/settlements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ month: '2026-12', force: true })
  });
  assert(thirdRes.status === 200, 'Lần 3: Chốt lại với force=true thành công (HTTP 200)');

  // TEST 4 — CHỐNG GIAN LẬN:
  // Client cố ý gửi kèm settlementRows với số tiền giả 999.999.999đ
  const fakePayloadRes = await fetch(`${API_BASE}/settlements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      month: '2026-11',
      force: true,
      settlementRows: [
        { partnerId: 'P1', commission: 999999999, branchFee: 999999999, total: 999999999 }
      ]
    })
  });
  const fakePayloadJson = await fakePayloadRes.json();
  assert(fakePayloadRes.status === 200, 'POST /api/settlements với payload giả trả về 200');
  
  // Kiểm tra số tiền server đã lưu: phải là số server tự tính (không nhận 999.999.999 giả)
  const p1Settle = fakePayloadJson.settlements.find(s => s.partnerId === 'P1');
  assert(p1Settle !== undefined, 'Server tìm thấy snapshot đối tác P1');
  assert(p1Settle.commission !== 999999999, 'Server BỎ QUA settlementRows giả (không nhận 999.999.999đ)');
  assert(p1Settle.branchFee !== 999999999, 'Server BỎ QUA phí nhánh giả');
  
  // Kiểm tra server tự tính khớp chính xác engine
  const currentDbRes = await fetch(`${API_BASE}/data`);
  const currentDb = (await currentDbRes.json()).data;
  const currentEngineResult = calculateMonthlySettlement('2026-11', currentDb);
  const expectedP1 = currentEngineResult.partnerRows.find(r => r.partnerId === 'P1');
  
  assertEqual(p1Settle.commission, expectedP1.commission, `Server tự tính hoa hồng P1 là ${expectedP1.commission.toLocaleString('vi-VN')} ₫`);
  assertEqual(p1Settle.branchFee, expectedP1.branchFee, `Server tự tính phí nhánh P1 là ${expectedP1.branchFee.toLocaleString('vi-VN')} ₫`);
  assertEqual(p1Settle.total, expectedP1.total, `Server tự tính tổng phải trả P1 là ${expectedP1.total.toLocaleString('vi-VN')} ₫`);

} catch (err) {
  console.error('❌ Lỗi kết nối API trong Test 3 & 4:', err.message);
  process.exit(1);
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


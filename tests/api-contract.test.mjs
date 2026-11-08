import { parseVisitStepAndStatus } from '../src/utils/treatmentSteps.js';

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
console.log('KIỂM THỬ API CONTRACT & XỬ LÝ LÂM SÀNG (tests/api-contract.test.mjs)');
console.log('====================================================\n');

// ----------------------------------------------------
// 1. KIỂM THỬ parseVisitStepAndStatus
// ----------------------------------------------------
console.log('--- 1. KIỂM THỬ PARSE BƯỚC ĐIỀU TRỊ & TRẠNG THÁI THANH TOÁN ---');

// Mẫu 1: Gắn mắc cài - đã thanh toán
const s1 = parseVisitStepAndStatus('[Gắn mắc cài] Niềng răng trong suốt - Đã thanh toán • đợt 1');
assertEqual(s1.step, 'Gắn mắc cài', 'Mẫu 1: Trích xuất đúng bước [Gắn mắc cài]');
assertEqual(s1.status, 'paid', 'Mẫu 1: Trạng thái đúng [paid]');

// Mẫu 2: Cắt chỉ - chưa thanh toán / ghi nợ
const s2 = parseVisitStepAndStatus('[Cắt chỉ] Chưa thanh toán (ghi nợ 1.000.000đ)');
assertEqual(s2.step, 'Cắt chỉ', 'Mẫu 2: Trích xuất đúng bước [Cắt chỉ]');
assertEqual(s2.status, 'pending', 'Mẫu 2: Trạng thái đúng [pending] khi có "chưa thanh toán"');

// Mẫu 3: Mài cùi - thanh toán một phần
const s3 = parseVisitStepAndStatus('[Mài cùi răng] Bọc sứ thẩm mỹ - thanh toán một phần (còn thiếu 5tr)');
assertEqual(s3.step, 'Mài cùi răng', 'Mẫu 3: Trích xuất đúng bước [Mài cùi răng]');
assertEqual(s3.status, 'partial', 'Mẫu 3: Trạng thái đúng [partial] khi có "thanh toán một phần"');

// Mẫu 4: Dạng dấu hai chấm "Tái khám: Siết răng định kỳ"
const s4 = parseVisitStepAndStatus('Tái khám: Siết răng định kỳ');
assertEqual(s4.step, 'Siết răng định kỳ', 'Mẫu 4: Trích xuất đúng sau dấu hai chấm');
assertEqual(s4.status, 'paid', 'Mẫu 4: Trạng thái mặc định là paid');

// Mẫu 5: Văn bản thô không dấu ngoặc
const s5 = parseVisitStepAndStatus('Vệ sinh răng miệng và lấy cao răng');
assertEqual(s5.step, 'Vệ sinh răng miệng và lấy cao răng', 'Mẫu 5: Giữ nguyên văn bản thô');
assertEqual(s5.status, 'paid', 'Mẫu 5: Trạng thái mặc định là paid');

// Mẫu 6: Chuỗi rỗng / null
const s6 = parseVisitStepAndStatus('');
assertEqual(s6.step, 'Điều trị', 'Mẫu 6: Chuỗi rỗng fallback về "Điều trị"');
assertEqual(s6.status, 'paid', 'Mẫu 6: Chuỗi rỗng fallback status về "paid"');

const s6Null = parseVisitStepAndStatus(null);
assertEqual(s6Null.step, 'Điều trị', 'Mẫu 6 (null): fallback về "Điều trị"');

// Mẫu 7: Object visit trực tiếp có cột chuẩn (snake_case)
const s7 = parseVisitStepAndStatus({
  treatment_step: 'Cấy ghép trụ Implant',
  payment_status: 'partial',
  note: '[Khám tổng quát] Đã thanh toán' // note cũ khác với cột trực tiếp
});
assertEqual(s7.step, 'Cấy ghép trụ Implant', 'Mẫu 7: Ưu tiên cột treatment_step trên object');
assertEqual(s7.status, 'partial', 'Mẫu 7: Ưu tiên cột payment_status trên object');

// Mẫu 8: Object visit trực tiếp có cột chuẩn (camelCase)
const s8 = parseVisitStepAndStatus({
  treatmentStep: 'Gắn mão sứ Cercon',
  paymentStatus: 'pending'
});
assertEqual(s8.step, 'Gắn mão sứ Cercon', 'Mẫu 8: Nhận diện cột camelCase treatmentStep');
assertEqual(s8.status, 'pending', 'Mẫu 8: Nhận diện cột camelCase paymentStatus');

console.log('\n--- 2. KIỂM THỬ KHỚP SCHEMA CAMELCASE <-> SNAKE_CASE ---');

// Contract: Partners
const dbPartner = {
  id: 'uuid-1',
  code: 'REF-P1',
  name: 'Đối tác 1',
  title: 'Bác sĩ',
  phone: '0901234567',
  email: 'p1@hhdental.vn',
  parent_id: null,
  depth: 0,
  status: 'ACTIVE',
  bank_name: 'Vietcombank',
  bank_account_no: '0011002233',
  bank_account_name: 'NGUYEN VAN A',
  joined_at: '2026-11-01T00:00:00Z',
  created_at: '2026-11-01T00:00:00Z'
};

const appPartner = {
  id: dbPartner.id,
  code: dbPartner.code,
  name: dbPartner.name,
  title: dbPartner.title,
  phone: dbPartner.phone,
  email: dbPartner.email,
  parentId: dbPartner.parent_id,
  depth: dbPartner.depth,
  status: dbPartner.status,
  bankName: dbPartner.bank_name,
  bankAccountNo: dbPartner.bank_account_no,
  bankAccountName: dbPartner.bank_account_name,
  joinedAt: dbPartner.joined_at,
  createdAt: dbPartner.created_at
};
assert(appPartner.parentId === null, 'Contract Partners: parentId <=> parent_id');
assert(appPartner.bankName === 'Vietcombank', 'Contract Partners: bankName <=> bank_name');

// Contract: Visits (4 cột mới)
const dbVisit = {
  id: 'v-001',
  customer_id: 'c-001',
  amount: '15000000',
  note: '[Gắn mắc cài] Ghi nợ 5tr',
  occurred_at: '2026-11-02T10:00:00Z',
  payment_status: 'partial',
  treatment_step: 'Gắn mắc cài',
  service_code: 'S1',
  service_name: 'Niềng răng',
  created_at: '2026-11-02T10:00:00Z'
};

const appVisit = {
  id: dbVisit.id,
  customerId: dbVisit.customer_id,
  amount: Number(dbVisit.amount),
  note: dbVisit.note,
  occurredAt: dbVisit.occurred_at,
  paymentStatus: dbVisit.payment_status,
  treatmentStep: dbVisit.treatment_step,
  serviceCode: dbVisit.service_code,
  serviceName: dbVisit.service_name,
  createdAt: dbVisit.created_at
};
assertEqual(appVisit.customerId, 'c-001', 'Contract Visits: customerId <=> customer_id');
assertEqual(appVisit.amount, 15000000, 'Contract Visits: amount parsed sang Number');
assertEqual(appVisit.paymentStatus, 'partial', 'Contract Visits: paymentStatus <=> payment_status');
assertEqual(appVisit.treatmentStep, 'Gắn mắc cài', 'Contract Visits: treatmentStep <=> treatment_step');
assertEqual(appVisit.serviceCode, 'S1', 'Contract Visits: serviceCode <=> service_code');
assertEqual(appVisit.serviceName, 'Niềng răng', 'Contract Visits: serviceName <=> service_name');

console.log('\n🎉 TOÀN BỘ CÁC KIỂM THỬ API CONTRACT ĐÃ THÀNH CÔNG 100%!');


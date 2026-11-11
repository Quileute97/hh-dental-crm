import {
  normalizeRefCode,
  sanitizeSelfSignupRole,
  buildPartnerReferralLink,
  getReferralCodeFromSearch,
  generatePartnerRefCode,
  getRootF0Partner
} from '../src/utils/referral.js';
import {
  calculatePartnerDepths,
  buildPartnerTree
} from '../src/services/commissionEngine.js';

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
console.log('KIỂM THỬ LINK REFERRAL, TICK PHÂN QUYỀN & CÂY F0 (tests/referral.test.mjs)');
console.log('====================================================\n');

console.log('--- 1. KIỂM THỬ CHUẨN HÓA MÃ & LINK REFERRAL ---');
assertEqual(normalizeRefCode('  ref-abc123 '), 'REF-ABC123', 'Chuẩn hóa chữ hoa + trim');
assertEqual(normalizeRefCode(null), '', 'null trả về chuỗi rỗng');

assertEqual(
  buildPartnerReferralLink('ref-f0-01', 'https://crm.hhdental.vn'),
  'https://crm.hhdental.vn/?ref=REF-F0-01',
  'Tạo link referral chuẩn từ origin không dấu / cuối'
);
assertEqual(
  buildPartnerReferralLink('REF-F0-01', 'https://crm.hhdental.vn/'),
  'https://crm.hhdental.vn/?ref=REF-F0-01',
  'Loại bỏ / dư ở cuối origin'
);
assertEqual(buildPartnerReferralLink('', 'https://crm.hhdental.vn'), '', 'Mã rỗng trả về chuỗi rỗng');

assertEqual(getReferralCodeFromSearch('?ref=ref-k9p2'), 'REF-K9P2', 'Parse ?ref từ đầu query string');
assertEqual(getReferralCodeFromSearch('?utm=zalo&ref=ref-b12&v=1'), 'REF-B12', 'Parse ?ref kèm tham số khác');
assertEqual(getReferralCodeFromSearch('?utm=fb'), '', 'Không có ?ref trả về rỗng');

const code1 = generatePartnerRefCode();
const code2 = generatePartnerRefCode();
assert(/^REF-[A-Z0-9]{6}$/.test(code1), `generatePartnerRefCode định dạng chuẩn: ${code1}`);
assert(code1 !== code2, `Hai mã sinh liên tiếp khác nhau: ${code1} vs ${code2}`);

console.log('\n--- 2. KIỂM THỬ TICK PHÂN QUYỀN TỰ ĐĂNG KÝ (WHITELIST BẢO MẬT) ---');
assertEqual(sanitizeSelfSignupRole('frontdesk'), 'frontdesk', 'Cho phép tick Lễ tân (frontdesk)');
assertEqual(sanitizeSelfSignupRole('FRONTDESK'), 'frontdesk', 'Chuẩn hóa FRONTDESK -> frontdesk');
assertEqual(sanitizeSelfSignupRole('partner'), 'partner', 'Cho phép tick CTV / Đối tác (partner)');
assertEqual(sanitizeSelfSignupRole('admin'), 'partner', 'Chặn leo thang quyền admin -> hạ về partner');
assertEqual(sanitizeSelfSignupRole('accountant'), 'partner', 'Chặn leo thang quyền accountant -> hạ về partner');
assertEqual(sanitizeSelfSignupRole('invalid-role'), 'partner', 'Vai trò lạ fallback an toàn về partner');
assertEqual(sanitizeSelfSignupRole(null), 'partner', 'null fallback an toàn về partner');

console.log('\n--- 3. KIỂM THỬ GẮN NGƯỜI DÙNG TỪ LINK VÀO CÂY ĐỐI TÁC F0 ---');
const treePartners = [
  { id: 'f0-a', code: 'REF-F0-A', name: 'BS. Nguyễn Văn A (F0)', parentId: null, depth: 0 },
  { id: 'f1-b', code: 'REF-F1-B', name: 'BS. Trần Văn B (T1)', parentId: 'f0-a', depth: 1 },
  { id: 'f2-c', code: 'REF-F2-C', name: 'CTV Lê Thị C (T2)', parentId: 'f1-b', depth: 2 },
  // Một cây F0 khác độc lập
  { id: 'f0-x', code: 'REF-F0-X', name: 'BS. Phạm X (F0 khác)', parentId: null, depth: 0 }
];

// Trường hợp 1: Đăng ký qua link của F0-A
const viaF0 = {
  id: 'new-u1',
  code: 'REF-NEW1',
  name: 'User ĐK từ F0-A',
  parentId: 'f0-a'
};
// Trường hợp 2: Đăng ký qua link của F2-C (thuộc cây F0-A)
const viaF2 = {
  id: 'new-u2',
  code: 'REF-NEW2',
  name: 'User ĐK từ F2-C',
  parentId: 'f2-c'
};

const updatedPartners = calculatePartnerDepths([...treePartners, viaF0, viaF2]);
const u1Computed = updatedPartners.find(p => p.id === 'new-u1');
const u2Computed = updatedPartners.find(p => p.id === 'new-u2');

assertEqual(u1Computed.depth, 1, 'Đăng ký từ link F0 có depth = 1');
assertEqual(u2Computed.depth, 3, 'Đăng ký từ link F2 có depth = 3');

const rootForU1 = getRootF0Partner('new-u1', updatedPartners);
assertEqual(rootForU1.root?.id, 'f0-a', 'U1 truy ngược đúng về cây F0-A');

const rootForU2 = getRootF0Partner('new-u2', updatedPartners);
assertEqual(rootForU2.root?.id, 'f0-a', 'U2 truy ngược qua F2 -> F1 đúng về cây F0-A');
assertEqual(rootForU2.chain.length, 4, 'Chuỗi cây F0-A -> F1-B -> F2-C -> U2 gồm 4 nút');

const tree = buildPartnerTree(updatedPartners);
assertEqual(tree.length, 2, 'Có đúng 2 cây đối tác gốc F0 độc lập');
const rootNodeA = tree.find(n => n.id === 'f0-a');
assert(rootNodeA.children.some(c => c.id === 'new-u1'), 'U1 nằm trong con trực tiếp của F0-A');

console.log('\n--- 4. KIỂM THỬ CHỐNG VÒNG LẶP CÂY ĐỐI TÁC ---');
const cyclic = [
  { id: 'p1', name: 'P1', parentId: 'p2' },
  { id: 'p2', name: 'P2', parentId: 'p1' }
];
const cycleRes = getRootF0Partner('p1', cyclic);
assert(cycleRes.chain.length === 2, 'Chống vòng lặp vô hạn khi parentId trỏ chéo nhau');

console.log('\n🎉 TOÀN BỘ KIỂM THỬ REFERRAL & CÂY ĐỐI TÁC F0 ĐÃ PASS 100%!');

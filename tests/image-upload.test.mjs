import {
  MAX_RAW_IMAGE_BYTES,
  validateIdCardFile,
  buildPartnerDocumentPath,
  isValidImageSource
} from '../src/utils/imageUpload.js';
import { mapPartnerRow } from '../src/services/api.js';

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
console.log('KIỂM THỬ UPLOAD ẢNH CCCD ĐỐI TÁC (tests/image-upload.test.mjs)');
console.log('====================================================\n');

console.log('--- 1. KIỂM THỬ validateIdCardFile ---');
assert(
  validateIdCardFile({ name: 'cccd-truoc.jpg', type: 'image/jpeg', size: 1024 * 500 }).ok === true,
  'Chấp nhận ảnh JPG hợp lệ'
);
assert(
  validateIdCardFile({ name: 'cccd-sau.png', type: 'image/png', size: 5 * 1024 * 1024 }).ok === true,
  'Chấp nhận ảnh PNG 5MB'
);
assert(
  validateIdCardFile({ name: 'cccd.webp', type: '', size: 2048 }).ok === true,
  'Chấp nhận ảnh WEBP dựa theo đuôi tệp khi MIME trống'
);
assert(
  validateIdCardFile(null).ok === false,
  'Từ chối tệp null'
);
assert(
  validateIdCardFile({ name: 'hop-dong.pdf', type: 'application/pdf', size: 1024 }).ok === false,
  'Từ chối tệp PDF không phải hình ảnh'
);
assert(
  validateIdCardFile({ name: 'payload.js', type: 'text/javascript', size: 512 }).ok === false,
  'Từ chối tệp script JS'
);
assert(
  validateIdCardFile({ name: 'huge.jpg', type: 'image/jpeg', size: MAX_RAW_IMAGE_BYTES + 1 }).ok === false,
  'Từ chối ảnh vượt quá giới hạn 15MB'
);

console.log('\n--- 2. KIỂM THỬ buildPartnerDocumentPath ---');
assertEqual(
  buildPartnerDocumentPath('550e8400-e29b-41d4-a716-446655440000', 'front', 'jpg', 1700000000000),
  'cccd/550e8400-e29b-41d4-a716-446655440000/front-1700000000000.jpg',
  'Đường dẫn Storage mặt trước CCCD chuẩn'
);
assertEqual(
  buildPartnerDocumentPath('550e8400-e29b-41d4-a716-446655440000', 'back', 'PNG', 1700000000001),
  'cccd/550e8400-e29b-41d4-a716-446655440000/back-1700000000001.png',
  'Đường dẫn Storage mặt sau CCCD chuẩn & lowercase ext'
);
assertEqual(
  buildPartnerDocumentPath('../hack/id', 'other', 'jpg..', 123),
  'cccd/hackid/front-123.jpg',
  'Sanitize đường dẫn chống path traversal'
);
assertEqual(
  buildPartnerDocumentPath('', 'back', 'webp', 456),
  'cccd/unassigned/back-456.webp',
  'Fallback partnerId rỗng sang unassigned'
);

console.log('\n--- 3. KIỂM THỬ isValidImageSource ---');
assert(isValidImageSource('https://example.supabase.co/storage/v1/object/public/partner-documents/cccd/a/front.jpg'), 'Chấp nhận URL https');
assert(isValidImageSource('http://localhost:54321/test.png'), 'Chấp nhận URL http');
assert(isValidImageSource('data:image/jpeg;base64,/9j/4AAQSkZJRg=='), 'Chấp nhận data:image/jpeg');
assert(!isValidImageSource('javascript:alert(1)'), 'Từ chối URI javascript:');
assert(!isValidImageSource('data:text/html,<script>alert(1)</script>'), 'Từ chối data:text/html');
assert(!isValidImageSource(''), 'Từ chối chuỗi rỗng');
assert(!isValidImageSource(null), 'Từ chối null');

console.log('\n--- 4. KIỂM THỬ mapPartnerRow VỚI CỘT CCCD NATIVE & FALLBACK ---');
const nativeMapped = mapPartnerRow({
  id: 'uuid-p1',
  code: 'REF-001',
  name: 'BS Nguyen',
  phone: '0909123456',
  parent_id: null,
  depth: 0,
  status: 'ACTIVE',
  id_card_front: 'https://cdn.test/front.jpg',
  id_card_back: 'https://cdn.test/back.jpg'
});
assertEqual(nativeMapped.idCardFront, 'https://cdn.test/front.jpg', 'mapPartnerRow giữ id_card_front native');
assertEqual(nativeMapped.idCardBack, 'https://cdn.test/back.jpg', 'mapPartnerRow giữ id_card_back native');

const clearedNativeMapped = mapPartnerRow(
  {
    id: 'uuid-p1',
    code: 'REF-001',
    name: 'BS Nguyen',
    id_card_front: null,
    id_card_back: null
  },
  { idCardFront: 'https://old.test/front.jpg', idCardBack: 'https://old.test/back.jpg' }
);
assertEqual(clearedNativeMapped.idCardFront, null, 'Khi DB đã có cột id_card_front = null thì ưu tiên giá trị cột DB');
assertEqual(clearedNativeMapped.idCardBack, null, 'Khi DB đã có cột id_card_back = null thì ưu tiên giá trị cột DB');

const fallbackMapped = mapPartnerRow(
  {
    id: 'uuid-p2',
    code: 'REF-002',
    name: 'CTV Tran'
  },
  { idCardFront: 'data:image/jpeg;base64,FRONT', idCardBack: 'data:image/jpeg;base64,BACK' }
);
assertEqual(fallbackMapped.idCardFront, 'data:image/jpeg;base64,FRONT', 'Fallback audit_logs hoạt động khi DB chưa có cột CCCD');
assertEqual(fallbackMapped.idCardBack, 'data:image/jpeg;base64,BACK', 'Fallback audit_logs mặt sau hoạt động');

console.log('\n🎉 TOÀN BỘ KIỂM THỬ UPLOAD ẢNH CCCD ĐÃ THÀNH CÔNG 100%!');


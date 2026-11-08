import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Đọc cấu hình từ .env
let envContent = '';
try {
  envContent = fs.readFileSync('.env', 'utf8');
} catch (e) {
  console.error('Không tìm thấy tệp .env');
  process.exit(1);
}

const matchUrl = envContent.match(/VITE_SUPABASE_URL=(.+)/);
const matchKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);

if (!matchUrl || !matchKey) {
  console.error('Thiếu VITE_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env');
  process.exit(1);
}

const url = matchUrl[1].trim();
const serviceKey = matchKey[1].trim();
const supabase = createClient(url, serviceKey);

async function main() {
  console.log('================================================================================');
  console.log('HH DENTAL CRM - DỌN SẠCH DỮ LIỆU MẪU ĐỂ VẬN HÀNH DỮ LIỆU THỰC TẾ');
  console.log('================================================================================');
  console.log('Target Supabase:', url);

  try {
    // 1. Xóa visits
    console.log('1. Đang xóa toàn bộ visits mẫu...');
    const { error: errVisits } = await supabase.from('visits').delete().gt('amount', -1);
    if (errVisits) console.warn('Visits warning:', errVisits.message);
    else console.log('   ✅ Đã xóa toàn bộ visits.');

    // 2. Xóa settlements
    console.log('2. Đang xóa toàn bộ settlements mẫu...');
    const { error: errSettlements } = await supabase.from('settlements').delete().neq('month', '');
    if (errSettlements) console.warn('Settlements warning:', errSettlements.message);
    else console.log('   ✅ Đã xóa toàn bộ settlements.');

    // 3. Gỡ liên kết referrer trong customers
    console.log('3. Đang gỡ ràng buộc self-reference và xóa customers mẫu...');
    const { error: errUnref } = await supabase.from('customers').update({ referrer_customer_id: null }).neq('id', '00000000-0000-0000-0000-000000000000');
    if (errUnref) console.warn('Customers unref warning:', errUnref.message);

    const { error: errCustomers } = await supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (errCustomers) console.warn('Customers delete warning:', errCustomers.message);
    else console.log('   ✅ Đã xóa toàn bộ customers.');

    // 4. Gỡ partner_id trong profiles
    console.log('4. Đang gỡ liên kết partner_id trong bảng profiles...');
    const { error: errProfiles } = await supabase.from('profiles').update({ partner_id: null }).neq('user_id', '00000000-0000-0000-0000-000000000000');
    if (errProfiles) console.warn('Profiles unbind warning:', errProfiles.message);
    else console.log('   ✅ Đã gỡ liên kết partner_id trong profiles.');

    // 5. Gỡ parent_id và xóa partners
    console.log('5. Đang gỡ cấu trúc cây và xóa partners demo...');
    const { error: errUnparent } = await supabase.from('partners').update({ parent_id: null }).neq('id', '00000000-0000-0000-0000-000000000000');
    if (errUnparent) console.warn('Partners unparent warning:', errUnparent.message);

    const { error: errPartners } = await supabase.from('partners').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (errPartners) console.warn('Partners delete warning:', errPartners.message);
    else console.log('   ✅ Đã xóa toàn bộ partners demo.');

    // 6. Xóa audit_logs cũ
    console.log('6. Đang làm sạch bảng audit_logs...');
    const { error: errAudit } = await supabase.from('audit_logs').delete().neq('action', '');
    if (errAudit) console.warn('Audit logs warning:', errAudit.message);
    else console.log('   ✅ Đã làm sạch audit_logs.');

    // 7. Xác nhận dữ liệu sau dọn dẹp
    console.log('\n--- KIỂM TRA TRẠNG THÁI SAU KHI DỌN DẸP ---');
    const { data: vAfter } = await supabase.from('visits').select('id');
    const { data: cAfter } = await supabase.from('customers').select('id');
    const { data: pAfter } = await supabase.from('partners').select('id');
    const { data: sAfter } = await supabase.from('services').select('id, name');
    const { data: profAfter } = await supabase.from('profiles').select('user_id, role, full_name');

    console.log('Visits còn lại:', vAfter?.length || 0, '(yêu cầu: 0)');
    console.log('Customers còn lại:', cAfter?.length || 0, '(yêu cầu: 0)');
    console.log('Partners còn lại:', pAfter?.length || 0, '(yêu cầu: 0)');
    console.log('Services (Gói dịch vụ giữ lại):', sAfter?.length || 0, '(yêu cầu: 6)');
    console.log('Profiles (Tài khoản người dùng giữ lại):', profAfter?.length || 0, '(yêu cầu: 4)');

    if ((vAfter?.length === 0) && (cAfter?.length === 0) && (pAfter?.length === 0)) {
      console.log('\n🎉 DỌN SẠCH DỮ LIỆU MẪU THÀNH CÔNG 100%! HỆ THỐNG SẴN SÀNG NHẬP DỮ LIỆU THẬT.');
    } else {
      console.warn('\n⚠️ Một số bảng chưa sạch hoàn toàn, vui lòng kiểm tra lại SQL.');
    }
  } catch (err) {
    console.error('Lỗi khi thực thi xóa dữ liệu mẫu:', err);
    process.exit(1);
  }
}

main();


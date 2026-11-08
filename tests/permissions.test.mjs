import { CAN, can } from '../src/config/permissions.js';

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    console.error(`❌ FAIL: ${message} (Expected: ${expected}, Got: ${actual})`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message} = ${actual}`);
  }
}

console.log('====================================================');
console.log('KIỂM THỬ MA TRẬN PHÂN QUYỀN (tests/permissions.test.mjs)');
console.log('====================================================\n');

const ROLES = ['admin', 'accountant', 'frontdesk', 'partner'];
const ACTIONS = [
  'viewSystemRevenue',
  'viewProfit',
  'viewOtherPartners',
  'manageCustomers',
  'recordVisit',
  'managePartners',
  'manageServices',
  'settleMonth',
  'exportCsv',
  'viewAudit',
  'manageAccounts'
];

console.log('--- KIỂM TRA ĐẦY ĐỦ 4 VAI TRÒ × 11 HÀNH ĐỘNG (44 TRƯỜNG HỢP) ---');

// 1. Admin: Phải có toàn quyền trên cả 11 actions
for (const act of ACTIONS) {
  assertEqual(can('admin', act), true, `Admin can ${act}`);
}

// 2. Accountant: Có quyền tài chính, quyết toán, xuất CSV, audit; KHÔNG có quyền thêm/sửa khách, đối tác, dịch vụ, tài khoản
assertEqual(can('accountant', 'viewSystemRevenue'), true, 'Accountant can viewSystemRevenue');
assertEqual(can('accountant', 'viewProfit'), true, 'Accountant can viewProfit');
assertEqual(can('accountant', 'viewOtherPartners'), true, 'Accountant can viewOtherPartners');
assertEqual(can('accountant', 'manageCustomers'), false, 'Accountant CANNOT manageCustomers');
assertEqual(can('accountant', 'recordVisit'), false, 'Accountant CANNOT recordVisit');
assertEqual(can('accountant', 'managePartners'), false, 'Accountant CANNOT managePartners');
assertEqual(can('accountant', 'manageServices'), false, 'Accountant CANNOT manageServices');
assertEqual(can('accountant', 'settleMonth'), true, 'Accountant can settleMonth');
assertEqual(can('accountant', 'exportCsv'), true, 'Accountant can exportCsv');
assertEqual(can('accountant', 'viewAudit'), true, 'Accountant can viewAudit (read-only)');
assertEqual(can('accountant', 'manageAccounts'), false, 'Accountant CANNOT manageAccounts');

// 3. Frontdesk: Có quyền tiếp nhận khách, ghi visit; KHÔNG xem doanh thu/lợi nhuận hệ thống, quyết toán, đối tác, tài khoản
assertEqual(can('frontdesk', 'viewSystemRevenue'), false, 'Frontdesk CANNOT viewSystemRevenue');
assertEqual(can('frontdesk', 'viewProfit'), false, 'Frontdesk CANNOT viewProfit');
assertEqual(can('frontdesk', 'viewOtherPartners'), false, 'Frontdesk CANNOT viewOtherPartners');
assertEqual(can('frontdesk', 'manageCustomers'), true, 'Frontdesk can manageCustomers');
assertEqual(can('frontdesk', 'recordVisit'), true, 'Frontdesk can recordVisit');
assertEqual(can('frontdesk', 'managePartners'), false, 'Frontdesk CANNOT managePartners');
assertEqual(can('frontdesk', 'manageServices'), false, 'Frontdesk CANNOT manageServices');
assertEqual(can('frontdesk', 'settleMonth'), false, 'Frontdesk CANNOT settleMonth');
assertEqual(can('frontdesk', 'exportCsv'), false, 'Frontdesk CANNOT exportCsv');
assertEqual(can('frontdesk', 'viewAudit'), false, 'Frontdesk CANNOT viewAudit');
assertEqual(can('frontdesk', 'manageAccounts'), false, 'Frontdesk CANNOT manageAccounts');

// 4. Partner: Chỉ có quyền tải CSV của mình; KHÔNG xem hệ thống, chốt sổ, quản lý khách/đối tác/dịch vụ/tài khoản
assertEqual(can('partner', 'viewSystemRevenue'), false, 'Partner CANNOT viewSystemRevenue');
assertEqual(can('partner', 'viewProfit'), false, 'Partner CANNOT viewProfit');
assertEqual(can('partner', 'viewOtherPartners'), false, 'Partner CANNOT viewOtherPartners');
assertEqual(can('partner', 'manageCustomers'), false, 'Partner CANNOT manageCustomers');
assertEqual(can('partner', 'recordVisit'), false, 'Partner CANNOT recordVisit');
assertEqual(can('partner', 'managePartners'), false, 'Partner CANNOT managePartners');
assertEqual(can('partner', 'manageServices'), false, 'Partner CANNOT manageServices');
assertEqual(can('partner', 'settleMonth'), false, 'Partner CANNOT settleMonth');
assertEqual(can('partner', 'exportCsv'), true, 'Partner can exportCsv (cá nhân)');
assertEqual(can('partner', 'viewAudit'), false, 'Partner CANNOT viewAudit');
assertEqual(can('partner', 'manageAccounts'), false, 'Partner CANNOT manageAccounts');

// 5. Kiểm tra vai trò không hợp lệ / anon / null
assertEqual(can(null, 'viewSystemRevenue'), false, 'null role has no permissions');
assertEqual(can('anon', 'settleMonth'), false, 'anon role has no permissions');
assertEqual(can('hacker', 'manageAccounts'), false, 'invalid role has no permissions');
assertEqual(can('admin', 'unknownAction'), false, 'unknown action returns false');

console.log('\n🎉 TOÀN BỘ MA TRẬN PHÂN QUYỀN ĐÃ PASS 100% KIỂM TRA!');

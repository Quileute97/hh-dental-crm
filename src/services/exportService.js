/**
 * DENTAL CRM - DỊCH VỤ XUẤT CSV / EXCEL CHUẨN KẾ TOÁN (PLAN V5)
 * Hỗ trợ tiền tố Byte Order Mark (BOM) UTF-8 (\uFEFF) để Microsoft Excel hiển thị tiếng Việt có dấu chuẩn 100%.
 */
import { calculateCustomerCredit } from './commissionEngine';

/**
 * 3.6 Xuất CSV đối soát tháng chuẩn theo đặc tả Plan v5:
 * Cột: Đối tác, Tên, Cấp trên, Sổ khách, Doanh thu nhánh, Hoa hồng, Phí nhánh, Tổng.
 * 
 * @param {Array} partnerRows - Danh sách đối tác trong kỳ đối soát
 * @param {string} monthStr - Tháng đối soát (VD: '2026-11')
 */
export function exportSettlementToCSV(partnerRows, monthStr) {
  const headers = [
    'Đối tác',
    'Tên',
    'Cấp trên',
    'Sổ khách (VNĐ)',
    'Doanh thu nhánh (VNĐ)',
    'Hoa hồng CTV (VNĐ)',
    'Phí nhánh 1% (VNĐ)',
    'Tổng phải trả (VNĐ)',
    'Trạng thái chốt',
    'Ngân hàng',
    'Số tài khoản',
    'Chủ tài khoản'
  ];

  const rows = partnerRows.map(row => {
    return [
      `"${row.partnerCode || ''}"`,
      `"${row.partnerName || ''}"`,
      `"${row.parentName || '— (Gốc)'}"`,
      row.ownRevenue || 0,
      row.branchRevenue || 0,
      row.commission || 0,
      row.branchFee || 0,
      row.total || 0,
      `"${row.isSettled ? 'Đã chốt sổ' : 'Chưa chốt'}"`,
      `"${row.bankName || ''}"`,
      `"${row.bankAccountNo || ''}"`,
      `"${row.bankAccountName || ''}"`
    ];
  });

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  downloadCsvWithBOM(csvContent, `Bang_Doi_Soat_Quyet_Toan_Thang_${monthStr}_${formatDateForFile(new Date())}.csv`);
}

/**
 * Xuất danh sách khách hàng & doanh thu trọn đời
 */
export function exportCustomersToCSV(customers, visits, partners) {
  const partnerMap = new Map(partners.map(p => [p.id, p]));
  const customerMap = new Map(customers.map(c => [c.id, c]));

  // Tính tổng doanh thu tích lũy từng khách
  const revenueMap = new Map();
  visits.forEach(v => {
    const prev = revenueMap.get(v.customerId) || 0;
    revenueMap.set(v.customerId, prev + (v.amount || 0));
  });

  const headers = [
    'Mã khách hàng',
    'Họ và tên',
    'Số điện thoại',
    'Chủ sở hữu (CTV)',
    'Mã CTV',
    'Khách giới thiệu (Cấp cha)',
    'Độ sâu (Depth)',
    'Dịch vụ điều trị',
    'Doanh thu trọn đời (VNĐ)',
    'Credit tích lũy (VNĐ)',
    'Trạng thái',
    'Ngày đăng ký'
  ];

  const rows = customers.map(cust => {
    const owner = partnerMap.get(cust.ownerPartnerId);
    const parentCust = cust.referrerCustomerId ? customerMap.get(cust.referrerCustomerId) : null;
    const totalRev = revenueMap.get(cust.id) || 0;
    const credit = calculateCustomerCredit(customers, cust.id);

    return [
      `"${cust.code || cust.id}"`,
      `"${cust.name || ''}"`,
      `"${cust.phone || ''}"`,
      `"${owner?.name || 'N/A'}"`,
      `"${owner?.code || ''}"`,
      `"${parentCust ? `${parentCust.name} (${parentCust.code})` : 'Trực tiếp'}"`,
      cust.depth || 1,
      `"${cust.treatment || ''}"`,
      totalRev,
      credit,
      `"${translateCustomerStatus(cust.status)}"`,
      `"${new Date(cust.createdAt).toLocaleDateString('vi-VN')}"`
    ];
  });

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  downloadCsvWithBOM(csvContent, `Danh_Sach_Chuoi_Khach_Hang_${formatDateForFile(new Date())}.csv`);
}

function translateCustomerStatus(status) {
  switch (status) {
    case 'lead': return 'Tiếp nhận mới (Lead)';
    case 'arrived': return 'Đã đến khám';
    case 'completed': return 'Đã hoàn thành điều trị';
    default: return status || 'Mới';
  }
}

function formatDateForFile(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/**
 * Xuất file CSV với tiền tố Byte Order Mark (BOM) UTF-8 chuẩn xác (\uFEFF)
 */
function downloadCsvWithBOM(csvString, filename) {
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const pom = document.createElement('a');
  pom.href = url;
  pom.setAttribute('download', filename);
  pom.click();
  URL.revokeObjectURL(url);
}

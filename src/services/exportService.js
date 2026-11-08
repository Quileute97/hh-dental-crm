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

/**
 * Xuất danh sách lượt khám, bao gồm Bước điều trị và Trạng thái thanh toán lâm sàng
 */
export function exportVisitsToCSV(visits, customers = []) {
  const customerMap = new Map(customers.map(c => [c.id, c]));

  const headers = [
    'Mã lượt khám',
    'Mã khách hàng',
    'Tên khách hàng',
    'Số điện thoại',
    'Gói dịch vụ',
    'Bước điều trị',
    'Số tiền (VNĐ)',
    'Trạng thái thanh toán',
    'Thời gian điều trị',
    'Ghi chú'
  ];

  const rows = visits.map(v => {
    const cust = customerMap.get(v.customerId);
    const paymentLabel = v.paymentStatus === 'pending'
      ? 'Chưa thanh toán (Ghi nợ)'
      : v.paymentStatus === 'partial'
      ? 'Thanh toán một phần'
      : 'Đã thanh toán';

    return [
      `"${v.id || ''}"`,
      `"${cust?.code || v.customerId || ''}"`,
      `"${cust?.name || ''}"`,
      `"${cust?.phone || ''}"`,
      `"${v.serviceName || cust?.treatment || ''}"`,
      `"${v.treatmentStep || 'Điều trị'}"`,
      v.amount || 0,
      `"${paymentLabel}"`,
      `"${v.occurredAt ? new Date(v.occurredAt).toLocaleString('vi-VN') : ''}"`,
      `"${(v.note || '').replace(/"/g, '""')}"`
    ];
  });

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  downloadCsvWithBOM(csvContent, `Danh_Sach_Luot_Kham_Lam_Sang_${formatDateForFile(new Date())}.csv`);
}

/**
 * Xuất sổ nhật ký kiểm toán (Audit Logs) ra file CSV
 */
export function exportAuditLogsToCSV(logs) {
  const headers = [
    'Hành động (Action)',
    'Đối tượng (Entity)',
    'ID Đối tượng (Entity ID)',
    'Người thực hiện (Actor)',
    'Thời gian',
    'Dữ liệu thay đổi (Payload)'
  ];

  const rows = (logs || []).map(l => {
    return [
      `"${l.action || ''}"`,
      `"${l.entity || ''}"`,
      `"${l.entity_id || l.entityId || ''}"`,
      `"${l.actor || l.operator || ''}"`,
      `"${l.created_at || l.timestamp ? new Date(l.created_at || l.timestamp).toLocaleString('vi-VN') : ''}"`,
      `"${JSON.stringify(l.payload || l.details || {}).replace(/"/g, '""')}"`
    ];
  });

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  downloadCsvWithBOM(csvContent, `Nhat_Ky_Kiem_Toan_${formatDateForFile(new Date())}.csv`);
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

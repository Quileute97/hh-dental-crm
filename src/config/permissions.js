/**
 * HH DENTAL CRM - UNIFIED PERMISSION MATRIX (MA TRẬN PHÂN QUYỀN DUY NHẤT)
 * Định nghĩa tập trung quyền hạn cho 4 vai trò:
 * - admin: Toàn quyền hệ thống & phân quyền tài khoản
 * - accountant: Quản lý đối soát, quyết toán, chốt sổ, xuất CSV, kiểm toán read-only
 * - frontdesk: Tiếp đón khách hàng, ghi nhận lượt khám, quản lý công nợ
 * - partner: Xem đối soát cá nhân, cây khách hàng của mình, cập nhật tài khoản ngân hàng
 */

export const CAN = {
  viewSystemRevenue: ['admin', 'accountant'],
  viewProfit:        ['admin', 'accountant'],
  viewOtherPartners: ['admin', 'accountant'],
  manageCustomers:   ['admin', 'frontdesk'],
  recordVisit:       ['admin', 'frontdesk'],
  managePartners:    ['admin'],
  manageServices:    ['admin'],
  settleMonth:       ['admin', 'accountant'],
  exportCsv:         ['admin', 'accountant', 'partner'],
  viewAudit:         ['admin', 'accountant'],
  manageAccounts:    ['admin']
};

/**
 * Kiểm tra xem vai trò role có quyền thực hiện action hay không
 * @param {string} role - Vai trò ('admin' | 'accountant' | 'frontdesk' | 'partner')
 * @param {string} action - Hành động cần kiểm tra (thuộc keys của CAN)
 * @returns {boolean}
 */
export const can = (role, action) => {
  if (!role || !action) return false;
  return (CAN[action] || []).includes(role);
};

export default can;

-- ============================================================================
-- MIGRATION 007: CLEAR MOCK DATA (CHUẨN BỊ MÔI TRƯỜNG DỮ LIỆU THẬT)
-- Xóa toàn bộ dữ liệu mẫu giao dịch, lượt khám, khách hàng và đối tác demo
-- BẢO LƯU: Danh mục 6 Gói dịch vụ nha khoa & Tài khoản người dùng (profiles/auth)
-- ============================================================================

BEGIN;

-- 1. Xóa toàn bộ lượt khám và quyết toán mẫu
DELETE FROM visits;
DELETE FROM settlements;

-- 2. Gỡ liên kết người giới thiệu để tránh khóa ngoại tự tham chiếu trong customers
UPDATE customers SET referrer_customer_id = NULL;
DELETE FROM customers;

-- 3. Gỡ liên kết partner_id trong bảng profiles người dùng
UPDATE profiles SET partner_id = NULL;

-- 4. Gỡ liên kết cây nhánh con/cha trong partners trước khi xóa
UPDATE partners SET parent_id = NULL;
DELETE FROM partners;

-- 5. Xóa toàn bộ nhật ký kiểm toán mẫu
DELETE FROM audit_logs;

COMMIT;

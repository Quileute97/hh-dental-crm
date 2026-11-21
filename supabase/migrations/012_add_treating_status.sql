-- ============================================================================
-- SUPABASE MIGRATION 012: THÊM TRẠNG THÁI 'treating' VÀO CHECK CONSTRAINT BẢNG customers
-- Booking page (VoucherNhakhoa) chèn status='lead'
-- Lễ Tân bấm "Tiếp nhận" → update sang status='treating'
-- ============================================================================

alter table customers drop constraint if exists customers_status_check;

alter table customers add constraint customers_status_check 
  check (status in ('lead', 'arrived', 'treating', 'completed'));

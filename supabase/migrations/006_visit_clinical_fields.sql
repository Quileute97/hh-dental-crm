-- ============================================================================
-- SUPABASE MIGRATION 006: CLINICAL & PAYMENT STATUS FIELDS FOR VISITS
-- Bổ sung các trường lâm sàng & trạng thái thanh toán vào bảng visits
-- ============================================================================

begin;

-- 1. Bổ sung các cột lâm sàng và thanh toán
alter table visits add column if not exists payment_status text
  check (payment_status in ('paid', 'partial', 'pending')) default 'paid';

alter table visits add column if not exists treatment_step text;
alter table visits add column if not exists service_code text;
alter table visits add column if not exists service_name text;

-- 2. Backfill dữ liệu cho các bản ghi cũ từ trường note
-- Format note hiện tại thường có dạng: "[Gắn mắc cài] Niềng răng - Đã thanh toán • Ghi chú thêm"
update visits set payment_status = case
    when note ilike '%chưa thanh toán%' or note ilike '%ghi nợ%' then 'pending'
    when note ilike '%thanh toán một phần%' then 'partial'
    else 'paid'
  end
where payment_status is null;

update visits set treatment_step = coalesce(
  substring(note from '^\[(.*?)\]'),
  treatment_step
)
where treatment_step is null;

-- 3. Tạo index phục vụ lọc theo trạng thái thanh toán và công nợ
create index if not exists idx_visits_payment_status on visits(payment_status);
create index if not exists idx_visits_customer_payment on visits(customer_id, payment_status);

commit;


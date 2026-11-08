-- ============================================================================
-- SUPABASE MIGRATION 008: CẬP NHẬT TỶ LỆ HOA HỒNG THEO ĐỘ SÂU KHÁCH HÀNG
-- Logic:
--   - Tầng 1 (Trực tiếp): CTV hưởng 20%
--   - Tầng 2+ (Hạ tầng):  CTV hưởng 2%
-- ============================================================================

create or replace function ctv_rate(d int) returns numeric
language sql immutable as $$ 
  select case when d <= 1 then 20 else 2 end 
$$;

revoke execute on function ctv_rate(int) from public;
revoke execute on function ctv_rate(int) from anon;
grant execute on function ctv_rate(int) to authenticated, service_role;

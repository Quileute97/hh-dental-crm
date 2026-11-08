-- ============================================================================
-- SUPABASE MIGRATION 008: CẬP NHẬT TỶ LỆ HOA HỒNG THEO ĐỘ SÂU KHÁCH HÀNG
-- Logic:
--   - Tầng 1 (Trực tiếp): CTV hưởng 20%
--   - Tầng 2 (Hạ tầng):   CTV hưởng 10%
--   - Tầng 3 đến tầng n:  CTV hưởng 5%
-- ============================================================================

create or replace function ctv_rate(d int) returns numeric
language sql immutable as $$ 
  select case 
    when d <= 1 then 20 
    when d = 2 then 10 
    else 5 
  end 
$$;

revoke execute on function ctv_rate(int) from public;
revoke execute on function ctv_rate(int) from anon;
grant execute on function ctv_rate(int) to authenticated, service_role;

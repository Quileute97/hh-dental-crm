-- ============================================================================
-- SUPABASE MIGRATION 010: PARTNER ID CARD (CCCD) IMAGES & STORAGE BUCKET
-- 1. Bổ sung cột id_card_front & id_card_back vào bảng partners
-- 2. Khởi tạo Storage bucket 'partner-documents' và chính sách RLS upload/đọc
-- 3. RPC update_my_partner_kyc giúp đối tác tự cập nhật CCCD & ngân hàng cá nhân
-- ============================================================================

begin;

-- 1. Bổ sung 2 cột lưu URL/ảnh CCCD mặt trước & mặt sau vào bảng partners
alter table public.partners add column if not exists id_card_front text;
alter table public.partners add column if not exists id_card_back text;

-- 2. Khởi tạo Supabase Storage bucket 'partner-documents' (idempotent)
insert into storage.buckets (id, name, public)
values ('partner-documents', 'partner-documents', true)
on conflict (id) do nothing;

-- 3. Chính sách Storage cho bucket 'partner-documents'
drop policy if exists partner_docs_select on storage.objects;
create policy partner_docs_select on storage.objects
  for select
  using (bucket_id = 'partner-documents');

drop policy if exists partner_docs_insert on storage.objects;
create policy partner_docs_insert on storage.objects
  for insert
  with check (
    bucket_id = 'partner-documents'
    and auth.uid() is not null
    and (
      my_role() = 'admin'
      or (
        my_role() = 'partner'
        and my_partner_id() is not null
        and (storage.foldername(name))[1] = 'cccd'
        and (storage.foldername(name))[2] = my_partner_id()::text
      )
    )
  );

drop policy if exists partner_docs_update on storage.objects;
create policy partner_docs_update on storage.objects
  for update
  using (
    bucket_id = 'partner-documents'
    and auth.uid() is not null
    and (
      my_role() = 'admin'
      or (
        my_role() = 'partner'
        and my_partner_id() is not null
        and (storage.foldername(name))[1] = 'cccd'
        and (storage.foldername(name))[2] = my_partner_id()::text
      )
    )
  );

drop policy if exists partner_docs_delete on storage.objects;
create policy partner_docs_delete on storage.objects
  for delete
  using (
    bucket_id = 'partner-documents'
    and auth.uid() is not null
    and (
      my_role() = 'admin'
      or (
        my_role() = 'partner'
        and my_partner_id() is not null
        and (storage.foldername(name))[1] = 'cccd'
        and (storage.foldername(name))[2] = my_partner_id()::text
      )
    )
  );

-- 4. RPC cho phép đối tác tự cập nhật CCCD & thông tin ngân hàng cá nhân (an toàn dưới RLS)
create or replace function update_my_partner_kyc(
  p_id_card_front text default null,
  p_id_card_back text default null,
  p_bank_name text default null,
  p_bank_account_no text default null,
  p_bank_account_name text default null
)
returns setof public.partners
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := my_role();
  v_pid uuid := my_partner_id();
begin
  if auth.uid() is null then
    raise exception 'Yêu cầu đăng nhập để cập nhật hồ sơ đối tác.';
  end if;

  if v_pid is null or v_role not in ('partner', 'admin') then
    raise exception 'Tài khoản chưa liên kết hồ sơ đối tác hợp lệ.';
  end if;

  update public.partners
  set
    id_card_front = nullif(trim(coalesce(p_id_card_front, '')), ''),
    id_card_back = nullif(trim(coalesce(p_id_card_back, '')), ''),
    bank_name = coalesce(nullif(trim(p_bank_name), ''), bank_name),
    bank_account_no = coalesce(p_bank_account_no, bank_account_no),
    bank_account_name = coalesce(p_bank_account_name, bank_account_name)
  where id = v_pid;

  return query select * from public.partners where id = v_pid;
end;
$$;

revoke execute on function update_my_partner_kyc(text, text, text, text, text) from public;
revoke execute on function update_my_partner_kyc(text, text, text, text, text) from anon;
grant execute on function update_my_partner_kyc(text, text, text, text, text) to authenticated, service_role;

commit;

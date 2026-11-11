-- ============================================================================
-- SUPABASE MIGRATION 009: REFERRAL SIGNUP & ROLE-TICKED ACCOUNT TRIGGERS
-- 1. RPC công khai an toàn get_partner_by_ref_code(p_code) trả về thông tin đối tác GT & F0 gốc
-- 2. Trigger auth.users AFTER INSERT tự động tạo hồ sơ đối tác (gắn cây F0) & profile
--    cho tài khoản tự đăng ký với phân quyền hợp lệ ('frontdesk' | 'partner')
-- ============================================================================

begin;

-- 1. Tra cứu thông tin đối tác & F0 gốc theo mã REF (chỉ trả trường công khai an toàn)
create or replace function get_partner_by_ref_code(p_code text)
returns table(
  id uuid,
  code text,
  name text,
  title text,
  depth int,
  f0_id uuid,
  f0_code text,
  f0_name text
)
language sql
stable
security definer
set search_path = public
as $$
  with recursive target as (
    select p.id, p.code, p.name, p.title, p.depth, p.parent_id
    from partners p
    where upper(trim(p.code)) = upper(trim(coalesce(p_code, '')))
      and upper(coalesce(p.status, 'ACTIVE')) = 'ACTIVE'
    limit 1
  ),
  ancestors as (
    select t.id as start_id, t.id, t.code, t.name, t.parent_id, 0 as hops
    from target t
    union all
    select a.start_id, p.id, p.code, p.name, p.parent_id, a.hops + 1
    from ancestors a
    join partners p on p.id = a.parent_id
    where a.hops < 50
  ),
  root_f0 as (
    select a.id as f0_id, a.code as f0_code, a.name as f0_name
    from ancestors a
    order by a.hops desc
    limit 1
  )
  select
    t.id,
    t.code,
    t.name,
    t.title,
    coalesce(t.depth, 0) as depth,
    r.f0_id,
    r.f0_code,
    r.f0_name
  from target t
  left join root_f0 r on true;
$$;

revoke execute on function get_partner_by_ref_code(text) from public;
grant execute on function get_partner_by_ref_code(text) to anon, authenticated, service_role;

-- 2. Trigger tự động cấp hồ sơ khi có tài khoản auth.users mới đăng ký
create or replace function handle_new_user_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta jsonb := coalesce(NEW.raw_user_meta_data, '{}'::jsonb);
  v_role text := lower(trim(coalesce(v_meta->>'requested_role', '')));
  v_full_name text := nullif(trim(coalesce(v_meta->>'full_name', '')), '');
  v_phone text := nullif(trim(coalesce(v_meta->>'phone', '')), '');
  v_ref_code text := upper(trim(coalesce(v_meta->>'referrer_code', '')));
  v_parent_pid_raw text := trim(coalesce(v_meta->>'parent_partner_id', ''));
  v_existing_pid_raw text := trim(coalesce(v_meta->>'existing_partner_id', ''));
  v_custom_code text := upper(trim(coalesce(v_meta->>'partner_code', '')));

  v_parent_id uuid := null;
  v_parent_depth int := null;
  v_partner_id uuid := null;
  v_depth int := 0;
  v_title text;
  v_final_code text;
begin
  -- Chỉ tự động xử lý cho 2 vai trò tự đăng ký an toàn: 'frontdesk' hoặc 'partner'.
  -- Chặn hoàn toàn việc tự gán 'admin' / 'accountant' từ metadata phía client.
  if v_role not in ('frontdesk', 'partner') then
    return NEW;
  end if;

  if exists (select 1 from public.profiles where user_id = NEW.id) then
    return NEW;
  end if;

  if v_full_name is null then
    v_full_name := coalesce(split_part(coalesce(NEW.email, ''), '@', 1), 'Thành viên mới');
  end if;

  if v_role = 'frontdesk' then
    insert into public.profiles (user_id, role, partner_id, full_name)
    values (NEW.id, 'frontdesk', null, v_full_name)
    on conflict (user_id) do nothing;
    return NEW;
  end if;

  -- Vai trò 'partner': Kiểm tra xem có gắn vào partner có sẵn (từ luồng Admin) hay tạo mới trong cây F0
  if v_existing_pid_raw ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    select p.id into v_partner_id
    from public.partners p
    where p.id = v_existing_pid_raw::uuid
    limit 1;
  end if;

  if v_partner_id is null then
    -- Tìm đối tác tuyến trên theo parent_partner_id hoặc referrer_code
    if v_parent_pid_raw ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      select p.id, coalesce(p.depth, 0)
      into v_parent_id, v_parent_depth
      from public.partners p
      where p.id = v_parent_pid_raw::uuid
        and upper(coalesce(p.status, 'ACTIVE')) = 'ACTIVE'
      limit 1;
    end if;

    if v_parent_id is null and v_ref_code <> '' then
      select p.id, coalesce(p.depth, 0)
      into v_parent_id, v_parent_depth
      from public.partners p
      where upper(trim(p.code)) = v_ref_code
        and upper(coalesce(p.status, 'ACTIVE')) = 'ACTIVE'
      limit 1;
    end if;

    if v_parent_id is not null then
      v_depth := coalesce(v_parent_depth, 0) + 1;
      v_title := 'Đối tác Tuyến ' || v_depth::text;
    else
      v_depth := 0;
      v_title := 'Đối tác F0 (Gốc)';
    end if;

    v_final_code := nullif(v_custom_code, '');
    if v_final_code is null or exists (select 1 from public.partners where upper(code) = v_final_code) then
      v_final_code := 'REF-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    end if;

    v_partner_id := gen_random_uuid();

    insert into public.partners (id, code, name, title, phone, email, parent_id, depth, status)
    values (
      v_partner_id,
      v_final_code,
      v_full_name,
      v_title,
      coalesce(v_phone, ''),
      NEW.email,
      v_parent_id,
      v_depth,
      'ACTIVE'
    );
  end if;

  insert into public.profiles (user_id, role, partner_id, full_name)
  values (NEW.id, 'partner', v_partner_id, v_full_name)
  on conflict (user_id) do nothing;

  return NEW;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user_signup();

commit;


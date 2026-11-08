-- ============================================================================
-- HH DENTAL CLINIC - SECURITY FIX (BẢO MẬT & RLS CHỐNG LỖ HỔNG ANON)
-- Dán và chạy đoạn mã này trong Supabase SQL Editor
-- ============================================================================

-- 1. SỬA HÀM my_role() - KHÔNG FALLBACK 'admin' KHI CHƯA ĐĂNG NHẬP
create or replace function my_role() returns text
language sql stable security definer set search_path = public as $$
  select case
    when auth.uid() is null then 'anon'
    else coalesce((select role from profiles where user_id = auth.uid()), 'anon')
  end;
$$;

create or replace function my_partner_id() returns uuid
language sql stable security definer set search_path = public as $$
  select case
    when auth.uid() is null then null
    else (select partner_id from profiles where user_id = auth.uid())
  end;
$$;

-- 2. HÀM TỶ LỆ HOA HỒNG CTV THEO ĐỘ SÂU (T1: 20%, T2: 10%, T3+: 5%)
create or replace function ctv_rate(d int) returns numeric
language sql immutable as $$ 
  select case 
    when d <= 1 then 20 
    when d = 2 then 10 
    else 5 
  end 
$$;

-- 3. SỬA HÀM compute_month() - BẮT BUỘC ĐĂNG NHẬP, PHÂN QUYỀN PARTNER/ADMIN
create or replace function compute_month(p_month text)
returns table(
  partner_id uuid, 
  own_revenue bigint, 
  branch_revenue bigint,
  commission bigint, 
  branch_fee bigint, 
  total bigint
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_role text := my_role();
  v_pid uuid := my_partner_id();
begin
  if auth.uid() is null then
    raise exception 'Yêu cầu đăng nhập để truy cập dữ liệu tính toán hoa hồng.';
  end if;

  if v_role in ('admin', 'accountant') then
    return query
    with recursive
    period as (
      select v.*, c.depth, c.owner_partner_id
      from visits v join customers c on c.id = v.customer_id
      where v.occurred_at >= (p_month || '-01')::timestamptz
        and v.occurred_at <  ((p_month || '-01')::timestamptz + interval '1 month')
    ),
    own as (
      select p.id as pid, coalesce(sum(period.amount), 0)::bigint as rev
      from partners p left join period on period.owner_partner_id = p.id
      group by p.id
    ),
    comm as (
      select p.id as pid,
             coalesce(sum(round(period.amount * ctv_rate(period.depth) / 100.0)), 0)::bigint as commission
      from partners p left join period on period.owner_partner_id = p.id
      group by p.id
    ),
    down as (
      select p.id as root, p.id as node from partners p
      union all
      select d.root, ch.id from down d join partners ch on ch.parent_id = d.node
    ),
    branch as (
      select d.root as pid, coalesce(sum(o.rev), 0)::bigint as rev
      from down d join own o on o.pid = d.node
      group by d.root
    ),
    fee as (
      select p.parent_id as pid, round(coalesce(sum(b.rev), 0) * 0.01)::bigint as fee
      from partners p join branch b on b.pid = p.id
      where p.parent_id is not null
      group by p.parent_id
    )
    select p.id, o.rev, b.rev, c.commission, coalesce(f.fee, 0),
           (c.commission + coalesce(f.fee, 0))::bigint
    from partners p
    join own o on o.pid = p.id
    join branch b on b.pid = p.id
    join comm c on c.pid = p.id
    left join fee f on f.pid = p.id;
  elsif v_role = 'partner' and v_pid is not null then
    return query
    with recursive
    period as (
      select v.*, c.depth, c.owner_partner_id
      from visits v join customers c on c.id = v.customer_id
      where v.occurred_at >= (p_month || '-01')::timestamptz
        and v.occurred_at <  ((p_month || '-01')::timestamptz + interval '1 month')
    ),
    own as (
      select p.id as pid, coalesce(sum(period.amount), 0)::bigint as rev
      from partners p left join period on period.owner_partner_id = p.id
      group by p.id
    ),
    comm as (
      select p.id as pid,
             coalesce(sum(round(period.amount * ctv_rate(period.depth) / 100.0)), 0)::bigint as commission
      from partners p left join period on period.owner_partner_id = p.id
      group by p.id
    ),
    down as (
      select p.id as root, p.id as node from partners p
      union all
      select d.root, ch.id from down d join partners ch on ch.parent_id = d.node
    ),
    branch as (
      select d.root as pid, coalesce(sum(o.rev), 0)::bigint as rev
      from down d join own o on o.pid = d.node
      group by d.root
    ),
    fee as (
      select p.parent_id as pid, round(coalesce(sum(b.rev), 0) * 0.01)::bigint as fee
      from partners p join branch b on b.pid = p.id
      where p.parent_id is not null
      group by p.parent_id
    )
    select p.id, o.rev, b.rev, c.commission, coalesce(f.fee, 0),
           (c.commission + coalesce(f.fee, 0))::bigint
    from partners p
    join own o on o.pid = p.id
    join branch b on b.pid = p.id
    join comm c on c.pid = p.id
    left join fee f on f.pid = p.id
    where p.id in (select partner_subtree(v_pid));
  else
    raise exception 'Không có quyền truy cập dữ liệu tính toán hoa hồng.';
  end if;
end $$;

-- 3. SỬA HÀM settle_month() - BẮT BUỘC ĐĂNG NHẬP & CHỈ ADMIN / KẾ TOÁN
create or replace function settle_month(p_month text, p_force boolean default false)
returns setof settlements
language plpgsql security definer set search_path = public as $$
declare
  v_role text := my_role();
  v_exists boolean;
begin
  if auth.uid() is null then
    raise exception 'Yêu cầu đăng nhập để thực hiện chức năng này.';
  end if;

  if v_role not in ('admin','accountant') then
    raise exception 'Không có quyền thực hiện chốt sổ.';
  end if;

  if p_month !~ '^\d{4}-\d{2}$' then
    raise exception 'Định dạng tháng không hợp lệ (YYYY-MM).';
  end if;

  select exists(select 1 from settlements where month = p_month) into v_exists;
  if v_exists and not p_force then
    raise exception 'Kỳ % đã chốt. Gửi p_force = true để chốt lại.', p_month;
  end if;

  delete from settlements where month = p_month;

  insert into settlements(month, partner_id, partner_code, partner_name,
                          own_revenue, branch_revenue, commission, branch_fee, total, settled_by)
  select p_month, cm.partner_id, p.code, p.name,
         cm.own_revenue, cm.branch_revenue, cm.commission, cm.branch_fee, cm.total, auth.uid()
  from compute_month(p_month) cm join partners p on p.id = cm.partner_id;

  insert into audit_logs(action, entity, payload, actor)
  values ('MONTHLY_SETTLEMENT', 'SETTLEMENT', jsonb_build_object('month', p_month, 'forced', p_force), auth.uid());

  return query select * from settlements where month = p_month;
end $$;

-- 4. THU HỒI TOÀN BỘ QUYỀN THỰC THI TỪ PUBLIC VÀ ANON
revoke execute on function settle_month(text, boolean) from public;
revoke execute on function settle_month(text, boolean) from anon;
grant execute on function settle_month(text, boolean) to authenticated, service_role;

revoke execute on function compute_month(text) from public;
revoke execute on function compute_month(text) from anon;
grant execute on function compute_month(text) to authenticated, service_role;

revoke execute on function partner_subtree(uuid) from public;
revoke execute on function partner_subtree(uuid) from anon;
grant execute on function partner_subtree(uuid) to authenticated, service_role;

revoke execute on function ctv_rate(int) from public;
revoke execute on function ctv_rate(int) from anon;
grant execute on function ctv_rate(int) to authenticated, service_role;

-- 5. THIẾT LẬP LẠI RLS POLICIES VỚI 'WITH CHECK' VÀ 'auth.uid() is not null'
drop policy if exists partners_read on partners;
drop policy if exists partners_write on partners;
drop policy if exists customers_read on customers;
drop policy if exists customers_write on customers;
drop policy if exists visits_read on visits;
drop policy if exists visits_write on visits;
drop policy if exists settlements_read on settlements;
drop policy if exists services_read on services;
drop policy if exists services_write on services;
drop policy if exists audit_read on audit_logs;
drop policy if exists audit_write on audit_logs;
drop policy if exists profiles_read on profiles;
drop policy if exists profiles_write on profiles;

-- Partners: Chỉ authenticated xem được (admin/accountant/frontdesk xem hết, partner xem cây con)
create policy partners_read on partners for select using (
  auth.uid() is not null and (
    my_role() in ('admin','accountant','frontdesk') or id in (select partner_subtree(my_partner_id()))
  )
);
create policy partners_write on partners for all
  using (auth.uid() is not null and my_role() = 'admin')
  with check (auth.uid() is not null and my_role() = 'admin');

-- Customers: Chỉ authenticated xem & ghi (chỉ admin và frontdesk ghi)
create policy customers_read on customers for select using (
  auth.uid() is not null and (
    my_role() in ('admin','accountant','frontdesk') or owner_partner_id = my_partner_id()
  )
);
create policy customers_write on customers for all
  using (auth.uid() is not null and my_role() in ('admin','frontdesk'))
  with check (auth.uid() is not null and my_role() in ('admin','frontdesk'));

-- Visits: Chỉ authenticated xem & ghi (chỉ admin và frontdesk ghi)
create policy visits_read on visits for select using (
  auth.uid() is not null and (
    my_role() in ('admin','accountant','frontdesk') or exists (
      select 1 from customers c where c.id = visits.customer_id and c.owner_partner_id = my_partner_id()
    )
  )
);
create policy visits_write on visits for all
  using (auth.uid() is not null and my_role() in ('admin','frontdesk'))
  with check (auth.uid() is not null and my_role() in ('admin','frontdesk'));

-- Settlements: Chỉ admin, accountant hoặc partner sở hữu
create policy settlements_read on settlements for select using (
  auth.uid() is not null and (
    my_role() in ('admin','accountant') or partner_id = my_partner_id()
  )
);
create policy settlements_write on settlements for all
  using (auth.uid() is not null and my_role() in ('admin','accountant'))
  with check (auth.uid() is not null and my_role() in ('admin','accountant'));

-- Services: Bảng giá được xem công khai, chỉ admin sửa
create policy services_read on services for select using (true);
create policy services_write on services for all
  using (auth.uid() is not null and my_role() = 'admin')
  with check (auth.uid() is not null and my_role() = 'admin');

-- Audit Logs: Chỉ admin xem
create policy audit_read on audit_logs for select using (
  auth.uid() is not null and my_role() = 'admin'
);
create policy audit_write on audit_logs for insert with check (
  auth.uid() is not null
);

-- Profiles: Người dùng xem profile của mình, admin xem hết
create policy profiles_read on profiles for select using (
  auth.uid() is not null and (user_id = auth.uid() or my_role() = 'admin')
);
create policy profiles_write on profiles for all
  using (auth.uid() is not null and my_role() = 'admin')
  with check (auth.uid() is not null and my_role() = 'admin');


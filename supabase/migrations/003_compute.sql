-- ============================================================================
-- SUPABASE MIGRATION 003: POSTGRES COMPUTE ENGINE (SERVER-SIDE RPC - SECURED)
-- ============================================================================

-- Tỷ lệ hoa hồng CTV theo độ sâu của khách hàng:
-- Tầng 1 (trực tiếp) = 20%, Tầng 2+ (hạ tầng) = 2%
create or replace function ctv_rate(d int) returns numeric
language sql immutable as $$ 
  select case when d <= 1 then 20 else 2 end 
$$;

-- 1. Hàm tính hoa hồng & phí nhánh cho một tháng (Read-only RPC - Chỉ Authenticated)
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

-- 2. Hàm Chốt sổ hàng tháng (Chỉ Admin / Accountant - Không thể thực thi từ Anon)
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

-- Thu hồi toàn bộ quyền thực thi từ public và anon
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

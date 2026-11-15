-- ============================================================================
-- SUPABASE MIGRATION 011: CẬP NHẬT THƯỞNG DOANH SỐ CẤP QUẢN LÝ (BRANCH FEE) THÀNH 4%
-- Logic:
--   - Cấp trên nhận 4% doanh thu tính trên toàn bộ cây con trực tiếp.
--   - Cập nhật hàm compute_month(text) dùng hệ số 0.04 (thay cho 0.01).
-- ============================================================================

create or replace function compute_month(p_month text)
returns table(
  partner_id uuid,
  own_revenue bigint,
  branch_revenue bigint,
  commission bigint,
  branch_fee bigint,
  total bigint
)
language plpgsql security definer set search_path = public as $$
declare
  v_role text := my_role();
  v_pid uuid := my_partner_id();
begin
  if auth.uid() is null then
    raise exception 'Yêu cầu đăng nhập để truy cập số liệu tính toán.';
  end if;

  if p_month !~ '^\d{4}-\d{2}$' then
    raise exception 'Định dạng tháng không hợp lệ (YYYY-MM).';
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
      select p.parent_id as pid, round(coalesce(sum(b.rev), 0) * 0.04)::bigint as fee
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
      select p.parent_id as pid, round(coalesce(sum(b.rev), 0) * 0.04)::bigint as fee
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
    where p.id = v_pid;
  else
    raise exception 'Không có quyền truy cập dữ liệu tính toán hoa hồng.';
  end if;
end $$;

revoke execute on function compute_month(text) from public;
revoke execute on function compute_month(text) from anon;
grant execute on function compute_month(text) to authenticated, service_role;


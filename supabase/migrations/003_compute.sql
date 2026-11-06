-- ============================================================================
-- SUPABASE MIGRATION 003: POSTGRES COMPUTE ENGINE (SERVER-SIDE RPC)
-- ============================================================================

-- Tỷ lệ hoa hồng CTV theo độ sâu của khách hàng:
-- Tầng 1 (trực tiếp) = 20%, Tầng 2+ (hạ tầng) = 2%
create or replace function ctv_rate(d int) returns numeric
language sql immutable as $$ 
  select case when d <= 1 then 20 else 2 end 
$$;

-- 1. Hàm tính hoa hồng & phí nhánh cho một tháng (Read-only RPC)
create or replace function compute_month(p_month text)
returns table(
  partner_id uuid, 
  own_revenue bigint, 
  branch_revenue bigint,
  commission bigint, 
  branch_fee bigint, 
  total bigint
)
language sql stable security definer set search_path = public as $$
with
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
$$;

-- 2. Hàm Chốt sổ hàng tháng (Thực thi ghi dữ liệu, yêu cầu quyền Admin / Accountant)
create or replace function settle_month(p_month text, p_force boolean default false)
returns setof settlements
language plpgsql security definer set search_path = public as $$
declare
  v_role text := my_role();
  v_exists boolean;
begin
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

-- Thu hồi quyền thực thi trực tiếp từ anon
revoke all on function settle_month(text, boolean) from anon;

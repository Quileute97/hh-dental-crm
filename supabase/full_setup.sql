-- ============================================================================
-- HH DENTAL CLINIC - SUPABASE TOÀN BỘ KHỞI TẠO (FULL SETUP)
-- Dán toàn bộ nội dung tệp này vào Supabase SQL Editor và bấm Run
-- ============================================================================

-- BẬT TIỆN ÍCH MÃ HÓA
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. BẢNG DỮ LIỆU CỐT LÕI
-- ----------------------------------------------------------------------------

-- 1.1 Bảng Đối Tác (Partners)
create table if not exists partners (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  title text,
  phone text,
  email text,
  parent_id uuid references partners(id) on delete restrict,
  depth int not null default 0,
  status text not null default 'ACTIVE',
  bank_name text,
  bank_account_no text,
  bank_account_name text,
  joined_at date,
  created_at timestamptz not null default now()
);
create index if not exists idx_partners_parent on partners(parent_id);
create index if not exists idx_partners_depth on partners(depth);

-- 1.2 Bảng Gói Dịch Vụ (Services)
create table if not exists services (
  id uuid primary key default gen_random_uuid(),
  code text,
  name text not null,
  default_price bigint not null default 0,
  active boolean not null default true
);

-- 1.3 Bảng Chuỗi Khách Hàng (Customers)
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  phone text,
  owner_partner_id uuid not null references partners(id),
  referrer_customer_id uuid references customers(id),
  depth int not null default 1,
  treatment text,
  status text not null default 'lead' check (status in ('lead','arrived','completed')),
  created_at timestamptz not null default now()
);
create index if not exists idx_customers_owner on customers(owner_partner_id);
create index if not exists idx_customers_referrer on customers(referrer_customer_id);

-- 1.4 Bảng Lượt Điều Trị & Doanh Thu Trọn Đời (Visits)
create table if not exists visits (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  amount bigint not null check (amount > 0),
  note text,
  occurred_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_visits_customer on visits(customer_id);
create index if not exists idx_visits_date on visits(occurred_at);

-- 1.5 Bảng Chốt Sổ & Quyết Toán Tháng (Settlements)
create table if not exists settlements (
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  partner_id uuid not null references partners(id),
  partner_code text,
  partner_name text,
  own_revenue bigint not null,
  branch_revenue bigint not null,
  commission bigint not null,
  branch_fee bigint not null,
  total bigint not null,
  settled_at timestamptz not null default now(),
  settled_by uuid references auth.users(id),
  primary key (month, partner_id)
);

-- 1.6 Bảng Nhật Ký Kiểm Toán (Audit Logs)
create table if not exists audit_logs (
  id bigserial primary key,
  action text not null,
  entity text,
  payload jsonb,
  actor uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- 1.7 Bảng Hồ Sơ Người Dùng & Phân Quyền (Profiles)
create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','accountant','frontdesk','partner')),
  partner_id uuid references partners(id),
  full_name text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. HÀM PHÂN QUYỀN VÀ ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------------------

create or replace function my_role() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select role from profiles where user_id = auth.uid()), 'admin');
$$;

create or replace function my_partner_id() returns uuid
language sql stable security definer set search_path = public as $$
  select partner_id from profiles where user_id = auth.uid();
$$;

create or replace function partner_subtree(root uuid) returns setof uuid
language sql stable security definer set search_path = public as $$
  with recursive t as (
    select id from partners where id = root
    union all
    select p.id from partners p join t on p.parent_id = t.id
  ) select id from t;
$$;

-- BẬT RLS CHO TẤT CẢ CÁC BẢNG
alter table partners    enable row level security;
alter table customers   enable row level security;
alter table visits      enable row level security;
alter table settlements enable row level security;
alter table services    enable row level security;
alter table audit_logs  enable row level security;
alter table profiles    enable row level security;

-- Dọn dẹp policies cũ nếu chạy lại
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

-- POLICIES
create policy partners_read on partners for select using (
  my_role() in ('admin','accountant','frontdesk') or id in (select partner_subtree(my_partner_id()))
);
create policy partners_write on partners for all using (my_role() = 'admin');

create policy customers_read on customers for select using (
  my_role() in ('admin','accountant','frontdesk') or owner_partner_id = my_partner_id()
);
create policy customers_write on customers for all using (my_role() in ('admin','frontdesk'));

create policy visits_read on visits for select using (
  my_role() in ('admin','accountant','frontdesk') or exists (
    select 1 from customers c where c.id = visits.customer_id and c.owner_partner_id = my_partner_id()
  )
);
create policy visits_write on visits for all using (my_role() in ('admin','frontdesk'));

create policy settlements_read on settlements for select using (
  my_role() in ('admin','accountant') or partner_id = my_partner_id()
);

create policy services_read on services for select using (true);
create policy services_write on services for all using (my_role() = 'admin');

create policy audit_read on audit_logs for select using (my_role() = 'admin');
create policy audit_write on audit_logs for insert with check (auth.uid() is not null);

create policy profiles_read on profiles for select using (user_id = auth.uid() or my_role() = 'admin');
create policy profiles_write on profiles for all using (my_role() = 'admin');

-- ----------------------------------------------------------------------------
-- 3. HÀM TÍNH TOÁN HOA HỒNG & CHỐT SỔ (POSTGRES RPC)
-- ----------------------------------------------------------------------------

create or replace function ctv_rate(d int) returns numeric
language sql immutable as $$ 
  select case when d <= 1 then 20 else 2 end 
$$;

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

-- CẤP QUYỀN THỰC THI CHO API
grant execute on function compute_month(text) to authenticated, anon;
grant execute on function settle_month(text, boolean) to authenticated;
revoke all on function settle_month(text, boolean) from anon;

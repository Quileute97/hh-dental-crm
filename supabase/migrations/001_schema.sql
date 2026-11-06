-- ============================================================================
-- SUPABASE MIGRATION 001: CORE SCHEMA
-- ============================================================================

create extension if not exists "pgcrypto";

-- 1. Bảng Đối Tác (Partners)
create table partners (
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
create index idx_partners_parent on partners(parent_id);
create index idx_partners_depth on partners(depth);

-- 2. Bảng Gói Dịch Vụ (Services)
create table services (
  id uuid primary key default gen_random_uuid(),
  code text,
  name text not null,
  default_price bigint not null default 0,
  active boolean not null default true
);

-- 3. Bảng Chuỗi Khách Hàng (Customers)
create table customers (
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
create index idx_customers_owner on customers(owner_partner_id);
create index idx_customers_referrer on customers(referrer_customer_id);

-- 4. Bảng Lượt Điều Trị & Doanh Thu Trọn Đời (Visits)
create table visits (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  amount bigint not null check (amount > 0),
  note text,
  occurred_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index idx_visits_customer on visits(customer_id);
create index idx_visits_date on visits(occurred_at);

-- 5. Bảng Chốt Sổ & Quyết Toán Tháng (Settlements)
create table settlements (
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

-- 6. Bảng Nhật Ký Kiểm Toán (Audit Logs)
create table audit_logs (
  id bigserial primary key,
  action text not null,
  entity text,
  payload jsonb,
  actor uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- 7. Bảng Hồ Sơ Người Dùng & Phân Quyền (Profiles)
create table profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','accountant','frontdesk','partner')),
  partner_id uuid references partners(id),
  full_name text,
  created_at timestamptz not null default now()
);

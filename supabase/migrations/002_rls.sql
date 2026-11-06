-- ============================================================================
-- SUPABASE MIGRATION 002: ROW LEVEL SECURITY (RLS) & ACCESS CONTROL
-- ============================================================================

-- Hàm lấy role của user hiện tại từ profiles
create or replace function my_role() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select role from profiles where user_id = auth.uid()), 'anon');
$$;

-- Hàm lấy partner_id của user hiện tại (nếu là role partner)
create or replace function my_partner_id() returns uuid
language sql stable security definer set search_path = public as $$
  select partner_id from profiles where user_id = auth.uid();
$$;

-- Hàm đệ quy lấy toàn bộ cây con (subtree) của một đối tác
create or replace function partner_subtree(root uuid) returns setof uuid
language sql stable security definer set search_path = public as $$
  with recursive t as (
    select id from partners where id = root
    union all
    select p.id from partners p join t on p.parent_id = t.id
  ) select id from t;
$$;

-- BẬT RLS CHO TOÀN BỘ CÁC BẢNG
alter table partners       enable row level security;
alter table customers      enable row level security;
alter table visits         enable row level security;
alter table settlements    enable row level security;
alter table services       enable row level security;
alter table audit_logs     enable row level security;
alter table profiles       enable row level security;

-- 1. Bảng partners
create policy partners_read on partners for select using (
  my_role() in ('admin','accountant','frontdesk') or id in (select partner_subtree(my_partner_id()))
);
create policy partners_write on partners for all using (my_role() = 'admin');

-- 2. Bảng customers
create policy customers_read on customers for select using (
  my_role() in ('admin','accountant','frontdesk') or owner_partner_id = my_partner_id()
);
create policy customers_write on customers for all using (my_role() in ('admin','frontdesk'));

-- 3. Bảng visits
create policy visits_read on visits for select using (
  my_role() in ('admin','accountant','frontdesk') or exists (
    select 1 from customers c where c.id = visits.customer_id and c.owner_partner_id = my_partner_id()
  )
);
create policy visits_write on visits for all using (my_role() in ('admin','frontdesk'));

-- 4. Bảng settlements
create policy settlements_read on settlements for select using (
  my_role() in ('admin','accountant') or partner_id = my_partner_id()
);

-- 5. Bảng services
create policy services_read on services for select using (auth.uid() is not null);
create policy services_write on services for all using (my_role() = 'admin');

-- 6. Bảng audit_logs
create policy audit_read on audit_logs for select using (my_role() = 'admin');
create policy audit_write on audit_logs for insert with check (auth.uid() is not null);

-- 7. Bảng profiles
create policy profiles_read on profiles for select using (user_id = auth.uid() or my_role() = 'admin');
create policy profiles_write on profiles for all using (my_role() = 'admin');

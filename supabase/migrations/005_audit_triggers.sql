-- ============================================================================
-- SUPABASE MIGRATION 005: AUDIT LOG TRIGGERS
-- Tự động ghi vết kiểm toán cho customers, visits, partners, settlements
-- LƯU Ý: Migration này chưa apply lên production; quản trị viên cần apply thủ công trong Supabase SQL Editor.
-- ============================================================================

begin;

-- 1. Bổ sung cột entity_id nếu chưa có
alter table audit_logs add column if not exists entity_id text;

-- 2. Hàm trigger ghi nhật ký kiểm toán (security definer)
create or replace function fn_audit_log_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
  v_entity text;
  v_entity_id text;
  v_payload jsonb;
  v_actor uuid;
begin
  v_action := TG_OP;
  v_entity := TG_TABLE_NAME;
  v_actor := auth.uid();

  if TG_OP = 'INSERT' then
    if v_entity = 'settlements' then
      v_entity_id := NEW.month || '/' || NEW.partner_id::text;
    else
      v_entity_id := NEW.id::text;
    end if;
    v_payload := to_jsonb(NEW) - 'created_at';

  elsif TG_OP = 'UPDATE' then
    if v_entity = 'settlements' then
      v_entity_id := NEW.month || '/' || NEW.partner_id::text;
    else
      v_entity_id := NEW.id::text;
    end if;
    v_payload := jsonb_build_object(
      'before', to_jsonb(OLD) - 'created_at',
      'after', to_jsonb(NEW) - 'created_at'
    );

  elsif TG_OP = 'DELETE' then
    if v_entity = 'settlements' then
      v_entity_id := OLD.month || '/' || OLD.partner_id::text;
    else
      v_entity_id := OLD.id::text;
    end if;
    v_payload := to_jsonb(OLD) - 'created_at';
  end if;

  insert into audit_logs (action, entity, entity_id, payload, actor, created_at)
  values (v_action, v_entity, v_entity_id, v_payload, v_actor, now());

  if TG_OP = 'DELETE' then
    return OLD;
  else
    return NEW;
  end if;
end;
$$;

-- 3. Tạo Trigger Idempotent trên 4 bảng cốt lõi
drop trigger if exists trg_audit_customers on customers;
create trigger trg_audit_customers
after insert or update or delete on customers
for each row execute function fn_audit_log_trigger();

drop trigger if exists trg_audit_visits on visits;
create trigger trg_audit_visits
after insert or update or delete on visits
for each row execute function fn_audit_log_trigger();

drop trigger if exists trg_audit_partners on partners;
create trigger trg_audit_partners
after insert or update or delete on partners
for each row execute function fn_audit_log_trigger();

drop trigger if exists trg_audit_settlements on settlements;
create trigger trg_audit_settlements
after insert or update or delete on settlements
for each row execute function fn_audit_log_trigger();

commit;

-- Server-side audit rows for auth.users and public.users inserts.
-- Not granted to authenticated (triggers only). Client auth events use log_audit_event.

create or replace function public.insert_audit_log_row_internal(
  p_user_id uuid,
  p_role text,
  p_action text,
  p_table_name text,
  p_record_id text,
  p_ip_address text,
  p_user_agent text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (
    user_id, role, action, table_name, record_id, ip_address, user_agent
  ) values (
    p_user_id, p_role, p_action, p_table_name, p_record_id, p_ip_address, p_user_agent
  );
end;
$$;

revoke all on function public.insert_audit_log_row_internal(uuid, text, text, text, text, text, text) from public;

create or replace function public.trg_audit_auth_user_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.insert_audit_log_row_internal(
    new.id,
    null,
    'auth.user_created',
    'auth.users',
    new.id::text,
    null,
    null
  );
  return new;
end;
$$;

drop trigger if exists audit_auth_user_insert on auth.users;
create trigger audit_auth_user_insert
  after insert on auth.users
  for each row execute function public.trg_audit_auth_user_insert();

create or replace function public.trg_audit_public_users_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select r.name into v_role
  from public.roles r
  where r.id = new.role_id
  limit 1;

  perform public.insert_audit_log_row_internal(
    new.user_id,
    v_role,
    'users.profile_created',
    'users',
    new.user_id::text,
    null,
    null
  );
  return new;
end;
$$;

drop trigger if exists audit_public_users_insert on public.users;
create trigger audit_public_users_insert
  after insert on public.users
  for each row execute function public.trg_audit_public_users_insert();

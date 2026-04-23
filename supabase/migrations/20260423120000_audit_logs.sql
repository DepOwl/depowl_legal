-- Audit log entries (admin-readable). Inserts go through public.log_audit_event() only.

create table public.audit_logs (
  id bigint generated always as identity primary key,
  event_time timestamptz not null default now(),
  user_id uuid references auth.users (id) on delete set null,
  role text,
  action text not null,
  table_name text,
  record_id text,
  ip_address text,
  user_agent text
);

create index audit_logs_event_time_idx on public.audit_logs (event_time desc);

comment on table public.audit_logs is 'Security and data-change audit trail; readable only by admins.';

alter table public.audit_logs enable row level security;

drop policy if exists "audit_logs_select_admin" on public.audit_logs;

create policy "audit_logs_select_admin"
on public.audit_logs
for select
to authenticated
using (public.current_user_is_admin());

revoke all on public.audit_logs from public;
grant select on public.audit_logs to authenticated;

-- Inserts: use this function so caller cannot spoof user_id; role is taken from public.users.
create or replace function public.log_audit_event(
  p_action text,
  p_table_name text default null,
  p_record_id text default null,
  p_ip_address text default null,
  p_user_agent text default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
  new_id bigint;
begin
  if v_uid is null then
    raise exception 'log_audit_event requires an authenticated user';
  end if;

  select r.name into v_role
  from public.users u
  join public.roles r on r.id = u.role_id
  where u.user_id = v_uid
  limit 1;

  insert into public.audit_logs (
    user_id, role, action, table_name, record_id, ip_address, user_agent
  ) values (
    v_uid, v_role, p_action, p_table_name, p_record_id, p_ip_address, p_user_agent
  )
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.log_audit_event(text, text, text, text, text) from public;
grant execute on function public.log_audit_event(text, text, text, text, text) to authenticated;

-- Audit logs: readable only by users with the `admin` role (same as
-- current_user_is_admin elsewhere). Removes super_admin role split if present.

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    join public.roles r on r.id = u.role_id
    where u.user_id = auth.uid()
      and lower(trim(r.name)) = 'admin'
  );
$$;

drop policy if exists "audit_logs_select_super_admin" on public.audit_logs;
drop policy if exists "audit_logs_select_admin" on public.audit_logs;

create policy "audit_logs_select_admin"
on public.audit_logs
for select
to authenticated
using (public.current_user_is_admin());

drop function if exists public.current_user_is_super_admin();

-- Explicit deny for authenticated DML (writes use log_audit_event only).
drop policy if exists "audit_logs_insert_deny" on public.audit_logs;
drop policy if exists "audit_logs_update_deny" on public.audit_logs;
drop policy if exists "audit_logs_delete_deny" on public.audit_logs;

create policy "audit_logs_insert_deny"
on public.audit_logs
for insert
to authenticated
with check (false);

create policy "audit_logs_update_deny"
on public.audit_logs
for update
to authenticated
using (false)
with check (false);

create policy "audit_logs_delete_deny"
on public.audit_logs
for delete
to authenticated
using (false);

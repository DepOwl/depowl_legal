-- Admin predicate for RLS (joins public.users → public.roles on role_id).
-- Ensure a roles row exists with name matching 'admin' (case-insensitive), or change the literal below.

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

revoke all on function public.current_user_is_admin() from public;
grant execute on function public.current_user_is_admin() to authenticated;

-- Replace overly broad policies (OR-combined in Postgres). Names match common Supabase dashboard defaults.
drop policy if exists "Enable read access for all users" on public.jobs;
drop policy if exists "jobs_allow_users" on public.jobs;
drop policy if exists "jobs_select_users" on public.jobs;
drop policy if exists "super_full_access" on public.jobs;
drop policy if exists "Users can delete their own jobs" on public.jobs;
drop policy if exists "Users can insert their own jobs" on public.jobs;
drop policy if exists "Users can update their own jobs" on public.jobs;

alter table public.jobs enable row level security;

create policy "jobs_select_own_or_admin"
on public.jobs
for select
to authenticated
using (auth.uid() = user_id or public.current_user_is_admin());

create policy "jobs_insert_own"
on public.jobs
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "jobs_update_own"
on public.jobs
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "jobs_delete_own"
on public.jobs
for delete
to authenticated
using (auth.uid() = user_id);

-- Admins can read all profiles (for owner email on “All jobs”). Coexists with users_select_own via OR.
drop policy if exists "users_select_admin" on public.users;

create policy "users_select_admin"
on public.users
for select
to authenticated
using (public.current_user_is_admin());

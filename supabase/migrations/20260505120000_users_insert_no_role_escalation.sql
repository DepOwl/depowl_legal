-- Fix privilege escalation: the previous users_insert_own policy only verified
-- auth.uid() = user_id, leaving role_id unconstrained. An authenticated caller
-- could set role_id to the admin role UUID on signup and immediately gain admin
-- access via current_user_is_admin(). This migration tightens the insert policy
-- so that role_id must be NULL on self-signup. Role assignment is an admin-only
-- operation performed via a separate update policy.

drop policy if exists "users_insert_own" on public.users;

create policy "users_insert_own"
on public.users
for insert
to authenticated
with check (
  auth.uid() = user_id
  and role_id is null
);

-- Apply in Dashboard → SQL Editor, or via `supabase db push` for a linked project.

alter table public.users enable row level security;

drop policy if exists "users_insert_own" on public.users;
drop policy if exists "users_select_own" on public.users;

create policy "users_insert_own"
on public.users
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "users_select_own"
on public.users
for select
to authenticated
using (auth.uid() = user_id);

-- If email confirmation is on and signUp returns no session, uncomment a trigger
-- so a profile row is created from raw_user_meta_data (avoid double insert when
-- the client already inserts after signUp with a session).

-- create or replace function public.handle_new_user()
-- returns trigger
-- language plpgsql
-- security definer
-- set search_path = public
-- as $$
-- begin
--   insert into public.users (user_id, email, first_name, last_name, organization, csr_num, notes)
--   values (
--     new.id,
--     new.email,
--     nullif(btrim(coalesce(new.raw_user_meta_data->>'first_name', '')), ''),
--     nullif(btrim(coalesce(new.raw_user_meta_data->>'last_name', '')), ''),
--     nullif(btrim(coalesce(new.raw_user_meta_data->>'organization', '')), ''),
--     nullif(btrim(coalesce(new.raw_user_meta_data->>'csr_num', '')), ''),
--     nullif(btrim(coalesce(new.raw_user_meta_data->>'notes', '')), '')
--   );
--   return new;
-- end;
-- $$;
--
-- drop trigger if exists on_auth_user_created on auth.users;
-- create trigger on_auth_user_created
--   after insert on auth.users
--   for each row execute function public.handle_new_user();

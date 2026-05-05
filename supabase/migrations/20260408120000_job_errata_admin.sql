-- Admin errata uploads: job updates + Storage bucket job-errata.
-- Depends on public.current_user_is_admin() from prior migration.

-- If this fails, your jobs.status enum may use another type name (e.g. job_status)—adjust accordingly.
alter type public.status add value if not exists 'ready_for_download';

drop policy if exists "jobs_update_admin" on public.jobs;

create policy "jobs_update_admin"
on public.jobs
for update
to authenticated
using (public.current_user_is_admin())
with check (public.current_user_is_admin());

-- Private bucket for errata PDFs; path: {job_owner_user_id}/{job_id}/errata.pdf
insert into storage.buckets (id, name, public)
values ('job-errata', 'job-errata', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists "job_errata_insert_admin" on storage.objects;
drop policy if exists "job_errata_select_admin_or_owner" on storage.objects;
drop policy if exists "job_errata_delete_admin" on storage.objects;

create policy "job_errata_insert_admin"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'job-errata'
  and public.current_user_is_admin()
);

create policy "job_errata_select_admin_or_owner"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'job-errata'
  and (
    public.current_user_is_admin()
    or split_part(name, '/', 1) = auth.uid()::text
  )
);

create policy "job_errata_delete_admin"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'job-errata'
  and public.current_user_is_admin()
);

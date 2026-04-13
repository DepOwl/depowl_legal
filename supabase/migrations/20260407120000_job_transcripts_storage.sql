-- Private bucket for job PDFs. Client path: {auth.uid}/{job_id}/{filename}.pdf
-- Requires prior migration defining public.current_user_is_admin().

insert into storage.buckets (id, name, public)
values ('job-transcripts', 'job-transcripts', false)
on conflict (id) do update set public = excluded.public;

drop policy if exists "job_transcripts_insert_own" on storage.objects;
drop policy if exists "job_transcripts_select_own" on storage.objects;
drop policy if exists "job_transcripts_select_admin" on storage.objects;
drop policy if exists "job_transcripts_delete_own" on storage.objects;

create policy "job_transcripts_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'job-transcripts'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "job_transcripts_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'job-transcripts'
  and split_part(name, '/', 1) = auth.uid()::text
);

create policy "job_transcripts_select_admin"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'job-transcripts'
  and public.current_user_is_admin()
);

create policy "job_transcripts_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'job-transcripts'
  and split_part(name, '/', 1) = auth.uid()::text
);

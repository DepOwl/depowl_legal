-- Estimated ready date (scheduler) vs actual ready_date (errata upload).

alter table public.jobs
  add column if not exists ready_estimate_date date;

comment on column public.jobs.ready_estimate_date is
  'Estimated completion ~48h after promotion to in_progress; ready_date is set when errata is uploaded.';

create or replace function public.promote_uploaded_jobs()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_count integer;
begin
  update public.jobs
  set
    status = 'in_progress',
    ready_estimate_date = (now() + interval '48 hours')::date,
    updated_at = now()
  where status = 'uploaded'
    and created_at <= (now() - interval '4 hours');

  get diagnostics affected_count = row_count;
  return affected_count;
end;
$$;

revoke all on function public.promote_uploaded_jobs() from public;
grant execute on function public.promote_uploaded_jobs() to postgres;

-- Automatically promote uploaded jobs to in_progress after 4 hours.
-- Also sets a ready_date estimate 48 hours from promotion time.

create extension if not exists pg_cron with schema extensions;

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
    ready_date = (now() + interval '48 hours')::date,
    updated_at = now()
  where status = 'uploaded'
    and created_at <= (now() - interval '4 hours');

  get diagnostics affected_count = row_count;
  return affected_count;
end;
$$;

revoke all on function public.promote_uploaded_jobs() from public;
grant execute on function public.promote_uploaded_jobs() to postgres;

do $cron$
declare
  existing_job_id bigint;
begin
  select jobid
  into existing_job_id
  from cron.job
  where jobname = 'promote_uploaded_jobs_every_5_min'
  limit 1;

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;

  perform cron.schedule(
    'promote_uploaded_jobs_every_5_min',
    '*/5 * * * *',
    $sql$select public.promote_uploaded_jobs();$sql$
  );
end;
$cron$;

-- Trigger edge function call after a job row is created.
-- Sends only the minimal payload required by the function: { user_id }.

create extension if not exists pg_net with schema extensions;

create or replace function public.trg_jobs_send_uploaded_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_base_url text;
  v_anon_key text;
  v_headers jsonb := jsonb_build_object('Content-Type', 'application/json');
begin
  v_base_url := current_setting('app.settings.supabase_url', true);
  v_anon_key := current_setting('app.settings.anon_key', true);

  if v_base_url is null or btrim(v_base_url) = '' then
    -- Skip webhook if Supabase base URL is unavailable in DB settings.
    return new;
  end if;

  if v_anon_key is not null and btrim(v_anon_key) <> '' then
    v_headers := v_headers
      || jsonb_build_object('Authorization', 'Bearer ' || v_anon_key)
      || jsonb_build_object('apikey', v_anon_key);
  end if;

  perform net.http_post(
    url := v_base_url || '/functions/v1/sendJobUploadedConfirmation',
    headers := v_headers,
    body := jsonb_build_object('user_id', new.user_id),
    timeout_milliseconds := 5000
  );

  return new;
end;
$$;

drop trigger if exists jobs_send_uploaded_confirmation on public.jobs;
create trigger jobs_send_uploaded_confirmation
  after insert on public.jobs
  for each row execute function public.trg_jobs_send_uploaded_confirmation();

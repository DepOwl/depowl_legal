-- Remove the SQL trigger that called net.http_post with app.settings.supabase_url (never set in Supabase).
-- Confirmation emails are invoked via Dashboard → Integrations → Database Webhooks instead.
-- See supabase/DATABASE_WEBHOOK_JOBS.md.

drop trigger if exists jobs_send_uploaded_confirmation on public.jobs;

drop function if exists public.trg_jobs_send_uploaded_confirmation();

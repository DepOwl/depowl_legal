# Database Webhook: Errata Ready Email

This project includes the `sendErrataReadyEmail` Supabase Edge Function for emailing a job owner when an admin uploads an errata PDF.

## Required function secrets

Set these before deploying or invoking the function:

```bash
supabase secrets set \
  RESEND_API_KEY="re_xxxxxxxxxxxxxxxxx" \
  RESEND_FROM_EMAIL="Depowl Legal <noreply@yourdomain.com>" \
  ERRATA_WEBHOOK_SECRET="replace-with-a-long-random-string" \
  ERRATA_BUCKET="job-errata"
```

`ERRATA_BUCKET` is optional when the bucket id remains `job-errata`.

## Deploy the function

```bash
supabase functions deploy sendErrataReadyEmail
```

## Create the database webhook in Supabase Dashboard

Go to `Dashboard -> Integrations -> Database Webhooks` and create a webhook with:

- Name: `jobs_errata_ready_email`
- Table: `public.jobs`
- Events: `UPDATE`
- Method: `POST`
- URL: `https://<project-ref>.supabase.co/functions/v1/sendErrataReadyEmail`

Add a custom header:

- `x-webhook-secret: <same value as ERRATA_WEBHOOK_SECRET>`

The function ignores unrelated job updates and only sends an email when:

- `status` is `ready_for_download`
- `errata_path` is present
- the row newly becomes ready, or the errata attachment changes

## Local development webhook URL

When testing against the local Supabase stack, use:

```text
http://host.docker.internal:54321/functions/v1/sendErrataReadyEmail
```

Keep the same `x-webhook-secret` header in the local webhook configuration.

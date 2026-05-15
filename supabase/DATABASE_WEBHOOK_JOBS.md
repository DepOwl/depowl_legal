# Database Webhook: Job Uploaded Confirmation Email

This project includes the `sendJobUploadedConfirmation` Supabase Edge Function. It sends email to the uploader and to admins when a new row is inserted into `public.jobs`.

The function requires a shared secret header so anonymous or forged HTTP calls cannot trigger emails for arbitrary `user_id` values.

## Required function secrets

Set these before deploying or invoking the function:

```bash
supabase secrets set \
  RESEND_API_KEY="re_xxxxxxxxxxxxxxxxx" \
  RESEND_FROM_EMAIL="Depowl Legal <noreply@yourdomain.com>" \
  JOB_UPLOADED_WEBHOOK_SECRET="replace-with-a-long-random-string"
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically in the Edge runtime when deployed on Supabase.

## Deploy the function

```bash
supabase functions deploy sendJobUploadedConfirmation
```

## Create the database webhook in Supabase Dashboard

Go to `Dashboard -> Integrations -> Database Webhooks` and create a webhook with:

- Name: `jobs_uploaded_confirmation` (or any label you prefer)
- Table: `public.jobs`
- Events: `INSERT`
- Method: `POST`
- URL: `https://<project-ref>.supabase.co/functions/v1/sendJobUploadedConfirmation`

Add a custom header:

- `x-webhook-secret: <same value as JOB_UPLOADED_WEBHOOK_SECRET>`

The function rejects requests that omit the header, use the wrong secret, or are not shaped like a Supabase `INSERT` on `public.jobs` (so only your configured webhook should succeed).

## Local development webhook URL

When testing against the local Supabase stack, use:

```text
http://host.docker.internal:54321/functions/v1/sendJobUploadedConfirmation
```

Use the same `x-webhook-secret` header and set `JOB_UPLOADED_WEBHOOK_SECRET` for the local function (for example via `supabase secrets set` against the local project, or your local secrets workflow).

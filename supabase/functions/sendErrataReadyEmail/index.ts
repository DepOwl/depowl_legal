import { createClient } from 'jsr:@supabase/supabase-js@2'

type JobRow = {
  id?: number
  user_id?: string
  status?: string | null
  errata_path?: string | null
  errata_name?: string | null
}

type JobsUpdateWebhookPayload = {
  type?: 'UPDATE'
  table?: string
  schema?: string
  record?: JobRow | null
  old_record?: JobRow | null
}

type UserRow = {
  user_id: string
  email: string | null
  full_name: string | null
}

const DEFAULT_ERRATA_BUCKET = 'job-errata'
const RESEND_API_URL = 'https://api.resend.com/emails'
const ERRATA_READY_SUBJECT = 'Your errata sheet is ready for download'
const ERRATA_READY_TEXT = 'Your errata sheet is ready for download.'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function normalizeStatus(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase()
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').trim()
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }

  return btoa(binary)
}

function buildAttachmentName(record: JobRow): string {
  const explicitName = normalizeText(record.errata_name)
  if (explicitName) {
    return explicitName.toLowerCase().endsWith('.pdf')
      ? explicitName
      : `${explicitName}.pdf`
  }

  const fromPath = normalizeText(record.errata_path).split('/').pop() ?? ''
  if (fromPath) {
    return fromPath.toLowerCase().endsWith('.pdf') ? fromPath : `${fromPath}.pdf`
  }

  return 'errata.pdf'
}

function buildIdempotencyKey(record: JobRow): string {
  const raw = [
    'job',
    String(record.id ?? 'unknown'),
    normalizeText(record.errata_path),
    normalizeText(record.errata_name),
  ].join('-')

  return raw.replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 255)
}

async function sendResendEmail(input: {
  apiKey: string
  from: string
  to: string
  subject: string
  text: string
  html: string
  attachmentName: string
  attachmentBase64: string
  idempotencyKey: string
}): Promise<void> {
  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': input.idempotencyKey,
    },
    body: JSON.stringify({
      from: input.from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
      attachments: [
        {
          filename: input.attachmentName,
          content: input.attachmentBase64,
          contentType: 'application/pdf',
        },
      ],
    }),
  })

  if (!res.ok) {
    const errorBody = await res.text()
    throw new Error(`Resend error (${res.status}): ${errorBody}`)
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? ''
  const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL') ?? ''
  const errataBucket =
    normalizeText(Deno.env.get('ERRATA_BUCKET')) || DEFAULT_ERRATA_BUCKET
  const webhookSecret = normalizeText(Deno.env.get('ERRATA_WEBHOOK_SECRET') ?? '')
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    Deno.env.get('SUPABASE_SERVICE_ROLE') ??
    ''

  if (
    !resendApiKey ||
    !resendFromEmail ||
    !webhookSecret ||
    !supabaseUrl ||
    !serviceRoleKey
  ) {
    return jsonResponse(
      { error: 'Missing required server environment variables' },
      500,
    )
  }

  const headerSecret = normalizeText(req.headers.get('x-webhook-secret'))
  if (headerSecret !== webhookSecret) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  let payload: JobsUpdateWebhookPayload
  try {
    payload = (await req.json()) as JobsUpdateWebhookPayload
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  if (payload.type && payload.type !== 'UPDATE') {
    return jsonResponse({ status: 'ignored', reason: 'not an update event' })
  }

  const record = payload.record ?? null
  const oldRecord = payload.old_record ?? null

  if (!record) {
    return jsonResponse({ status: 'ignored', reason: 'missing record payload' })
  }

  const userId = normalizeText(record.user_id)
  const errataPath = normalizeText(record.errata_path)
  const status = normalizeStatus(record.status)
  const oldStatus = normalizeStatus(oldRecord?.status)
  const oldErrataPath = normalizeText(oldRecord?.errata_path)
  const oldErrataName = normalizeText(oldRecord?.errata_name)
  const errataName = normalizeText(record.errata_name)

  const becameReady =
    status === 'ready_for_download' && oldStatus !== 'ready_for_download'
  const attachmentChanged =
    errataPath !== '' &&
    (errataPath !== oldErrataPath || errataName !== oldErrataName)

  if (!userId || !errataPath || status !== 'ready_for_download') {
    return jsonResponse({ status: 'ignored', reason: 'job is not ready yet' })
  }

  if (!becameReady && !attachmentChanged) {
    return jsonResponse({
      status: 'ignored',
      reason: 'ready state and attachment unchanged',
    })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('user_id,email,full_name')
    .eq('user_id', userId)
    .single()

  if (userError || !user) {
    return jsonResponse(
      { error: userError?.message ?? 'User not found for job owner' },
      404,
    )
  }

  const jobOwner = user as UserRow
  const ownerEmail = normalizeText(jobOwner.email)
  if (!ownerEmail) {
    return jsonResponse({ error: 'Job owner does not have an email' }, 400)
  }

  const { data: fileData, error: downloadError } = await supabase.storage
    .from(errataBucket)
    .download(errataPath)

  if (downloadError || !fileData) {
    return jsonResponse(
      { error: downloadError?.message ?? 'Could not download errata PDF' },
      500,
    )
  }

  const bytes = new Uint8Array(await fileData.arrayBuffer())
  const attachmentBase64 = bytesToBase64(bytes)
  const attachmentName = buildAttachmentName(record)
  const ownerName = normalizeText(jobOwner.full_name)
  const greeting = ownerName ? `Hi ${ownerName},` : 'Hello,'
  const html = `<p>${greeting}</p><p>${ERRATA_READY_TEXT}</p>`

  try {
    await sendResendEmail({
      apiKey: resendApiKey,
      from: resendFromEmail,
      to: ownerEmail,
      subject: ERRATA_READY_SUBJECT,
      text: ERRATA_READY_TEXT,
      html,
      attachmentName,
      attachmentBase64,
      idempotencyKey: buildIdempotencyKey(record),
    })
  } catch (error) {
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Errata ready email send failed',
      },
      500,
    )
  }

  return jsonResponse({ status: 'sent' })
})

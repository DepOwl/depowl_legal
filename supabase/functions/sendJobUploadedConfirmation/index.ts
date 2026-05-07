import { createClient } from 'jsr:@supabase/supabase-js@2'

/** Plain POST body or Supabase Database Webhook INSERT payload (`record` holds the new row). */
type JobUploadedRequest = {
  user_id?: string
  record?: {
    user_id?: string
  }
}

type UserRow = {
  user_id: string
  email: string | null
  full_name: string | null
}

const RESEND_API_URL = 'https://api.resend.com/emails'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function sendResendEmail(input: {
  apiKey: string
  from: string
  to: string
  subject: string
  text: string
}): Promise<void> {
  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: input.from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
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
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const serviceRoleKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
    Deno.env.get('SUPABASE_SERVICE_ROLE') ??
    ''

  if (!resendApiKey || !resendFromEmail || !supabaseUrl || !serviceRoleKey) {
    return jsonResponse(
      { error: 'Missing required server environment variables' },
      500,
    )
  }

  let payload: JobUploadedRequest
  try {
    payload = (await req.json()) as JobUploadedRequest
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const userId = (payload.user_id ?? payload.record?.user_id ?? '').trim()
  if (!userId) {
    return jsonResponse({ error: 'Missing required field: user_id' }, 400)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('user_id,email,full_name')
    .eq('user_id', userId)
    .single()

  if (userError || !user) {
    return jsonResponse(
      { error: userError?.message ?? 'User not found for user_id' },
      404,
    )
  }

  const uploader = user as UserRow
  if (!uploader.email) {
    return jsonResponse({ error: 'Uploader user does not have an email' }, 400)
  }

  const uploaderName = (uploader.full_name ?? '').trim() || 'there'

  try {
    await sendResendEmail({
      apiKey: resendApiKey,
      from: resendFromEmail,
      to: uploader.email,
      subject: 'Transcript submitted',
      text: `Hi ${uploaderName}! Your transcript has been submitted. You will receive an email when the errata sheet is ready for download.`,
    })
  } catch {
    return jsonResponse({ error: 'Uploader email send failed' }, 500)
  }

  const { data: admins, error: adminsError } = await supabase
    .from('users')
    .select('user_id,email,full_name,roles!inner(name)')
    .eq('roles.name', 'admin')

  if (adminsError) {
    return jsonResponse({ error: adminsError.message }, 500)
  }

  const adminRows = (admins ?? []) as Array<
    UserRow & { roles: { name: string } | { name: string }[] }
  >

  for (const admin of adminRows) {
    const adminEmail = admin.email?.trim()
    if (!adminEmail) continue
    const adminName = (admin.full_name ?? '').trim() || 'admin'
    try {
      await sendResendEmail({
        apiKey: resendApiKey,
        from: resendFromEmail,
        to: adminEmail,
        subject: 'New transcript submitted',
        text: `Hi ${adminName}, there is a newly submitted transcript to look at.`,
      })
    } catch {
      return jsonResponse({ error: 'Admin email send failed' }, 500)
    }
  }

  return jsonResponse({ status: 'sent' })
})

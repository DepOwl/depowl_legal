import { logAuditEventFromClient } from '@/lib/auditLogs'
import { getSupabase } from '@/lib/supabase'
import type { AdminJobListRow, JobListRow } from '@/types/job'

const DEFAULT_TRANSCRIPTS_BUCKET = 'job-transcripts'
const DEFAULT_ERRATA_BUCKET = 'job-errata'

/** Used by create job form validation and server-side upload guard. */
export const MAX_JOB_PDF_BYTES = 25 * 1024 * 1024

function getTranscriptsBucket(): string {
  const v = import.meta.env.VITE_TRANSCRIPTS_BUCKET?.trim()
  return v || DEFAULT_TRANSCRIPTS_BUCKET
}

function getErrataBucket(): string {
  const v = import.meta.env.VITE_ERRATA_BUCKET?.trim()
  return v || DEFAULT_ERRATA_BUCKET
}

function sanitizePdfFileName(name: string): string {
  const base = name
    .replace(/^.*[/\\]/, '')
    .replace(/[^\w.-]+/g, '_')
    .slice(0, 180)
  const withExt = base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`
  return withExt
}

export async function fetchMyJobs(userId: string): Promise<JobListRow[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('jobs')
    .select(
      'id,status,transcript_name,transcript_size,created_at,due_date,ready_date,ready_estimate_date,errata_path',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }
  return (data ?? []) as JobListRow[]
}

export async function fetchAllJobs(): Promise<AdminJobListRow[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('jobs')
    .select(
      'id,status,transcript_name,transcript_size,created_at,due_date,ready_date,ready_estimate_date,errata_path,user_id',
    )
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  const rows = (data ?? []) as Omit<AdminJobListRow, 'owner_email'>[]
  const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))]
  const emailMap = await fetchUserEmailsByUserIds(userIds)

  return rows.map((r) => ({
    ...r,
    owner_email: emailMap[r.user_id] ?? null,
  }))
}

async function fetchUserEmailsByUserIds(
  userIds: string[],
): Promise<Record<string, string>> {
  if (userIds.length === 0) {
    return {}
  }
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('users')
    .select('user_id, email')
    .in('user_id', userIds)

  if (error) {
    throw new Error(error.message)
  }

  const map: Record<string, string> = {}
  for (const row of data ?? []) {
    const r = row as { user_id: string; email: string }
    if (r.user_id && r.email) {
      map[r.user_id] = r.email
    }
  }
  return map
}

export type CreateJobInput = {
  user_id: string
  transcript_name: string
  due_date: string
  /** Optional PDF; validated client-side before upload. */
  file?: File
}

export async function createJob(input: CreateJobInput): Promise<void> {
  const supabase = getSupabase()
  const bucket = getTranscriptsBucket()

  const { data: inserted, error: insertError } = await supabase
    .from('jobs')
    .insert({
      user_id: input.user_id,
      transcript_name: input.transcript_name,
      due_date: input.due_date,
    })
    .select('id')
    .single()

  if (insertError) {
    throw new Error(insertError.message)
  }

  const jobId = inserted.id as number
  const file = input.file

  await logAuditEventFromClient({
    action: 'job_created',
    table_name: 'jobs',
    record_id: String(jobId),
    ip_address: null,
  })

  if (!file) {
    return
  }

  if (file.size > MAX_JOB_PDF_BYTES) {
    await supabase.from('jobs').delete().eq('id', jobId)
    throw new Error('PDF must be at most 25 MB.')
  }

  const safeName = sanitizePdfFileName(file.name)
  const objectPath = `${input.user_id}/${jobId}/${safeName}`

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(objectPath, file, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (uploadError) {
    await supabase.from('jobs').delete().eq('id', jobId)
    throw new Error(uploadError.message)
  }

  const { error: updateError } = await supabase
    .from('jobs')
    .update({
      transcript_path: objectPath,
      transcript_size: file.size,
    })
    .eq('id', jobId)

  if (updateError) {
    await supabase.storage.from(bucket).remove([objectPath])
    await supabase.from('jobs').delete().eq('id', jobId)
    throw new Error(updateError.message)
  }
}

const ERRATA_OBJECT_NAME = 'errata.pdf'

function localDateStringForPostgres(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export type UploadErrataInput = {
  jobId: number
  file: File
}

/** Admin: upload errata PDF to Storage, then set job errata fields and status. */
export async function uploadErrataForJob(input: UploadErrataInput): Promise<void> {
  const supabase = getSupabase()
  const bucket = getErrataBucket()
  const { file } = input

  if (file.size > MAX_JOB_PDF_BYTES) {
    throw new Error('PDF must be at most 25 MB.')
  }

  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('id,user_id')
    .eq('id', input.jobId)
    .single()

  if (jobError || !job) {
    throw new Error(jobError?.message ?? 'Job not found.')
  }

  const row = job as { id: number; user_id: string }
  const objectPath = `${row.user_id}/${row.id}/${ERRATA_OBJECT_NAME}`

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(objectPath, file, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (uploadError) {
    throw new Error(uploadError.message)
  }

  const errataName = sanitizePdfFileName(file.name)

  const { error: updateError } = await supabase
    .from('jobs')
    .update({
      errata_path: objectPath,
      errata_name: errataName,
      status: 'ready_for_download',
      ready_date: localDateStringForPostgres(),
    })
    .eq('id', row.id)

  if (updateError) {
    await supabase.storage.from(bucket).remove([objectPath])
    throw new Error(updateError.message)
  }
}

export async function getErrataDownloadUrl(
  errataPath: string,
): Promise<string> {
  const supabase = getSupabase()
  const bucket = getErrataBucket()
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(errataPath, 60 * 10)

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? 'Could not create a download URL.')
  }

  return data.signedUrl
}

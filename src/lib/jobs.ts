import { getSupabase } from '@/lib/supabase'
import type { AdminJobListRow, JobListRow } from '@/types/job'

export async function fetchMyJobs(userId: string): Promise<JobListRow[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('jobs')
    .select(
      'id,status,transcript_name,transcript_size,created_at,due_date,ready_date',
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
      'id,status,transcript_name,transcript_size,created_at,due_date,ready_date,user_id',
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
}

export async function createJob(input: CreateJobInput): Promise<void> {
  const supabase = getSupabase()
  const { error } = await supabase.from('jobs').insert({
    user_id: input.user_id,
    transcript_name: input.transcript_name,
    due_date: input.due_date,
  })
  if (error) {
    throw new Error(error.message)
  }
}

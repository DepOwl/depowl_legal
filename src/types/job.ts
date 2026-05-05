/** Row shape for `public.jobs` list views (subset of columns). */
export type JobListRow = {
  id: number
  status: string
  transcript_name: string
  transcript_size: number | null
  created_at: string
  due_date: string
  ready_date: string | null
  ready_estimate_date: string | null
  errata_path: string | null
}

/** Admin “all jobs” list: job row plus owner email when `users` is readable. */
export type AdminJobListRow = JobListRow & {
  user_id: string
  owner_email: string | null
}

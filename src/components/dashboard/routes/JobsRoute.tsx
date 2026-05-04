import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useDashboardOutlet } from '@/components/dashboard/useDashboardOutlet'
import { StatusIcon } from '@/components/dashboard/widgets/StatusIcon'
import { formatDateCell, formatTranscriptSizeKb } from '@/lib/format'
import { fetchMyJobs, getErrataDownloadUrl } from '@/lib/jobs'
import type { JobListRow } from '@/types/job'

export function DashboardJobsRoute() {
  const { user } = useDashboardOutlet()
  const [jobs, setJobs] = useState<JobListRow[]>([])
  const [jobsLoading, setJobsLoading] = useState(true)
  const [jobsError, setJobsError] = useState<string | null>(null)

  const loadJobs = useCallback(async () => {
    setJobsLoading(true)
    setJobsError(null)
    try {
      const rows = await fetchMyJobs(user.id)
      setJobs(rows)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not load jobs.'
      setJobsError(msg)
      toast.error('Failed to load jobs', { description: msg })
    } finally {
      setJobsLoading(false)
    }
  }, [user.id])

  useEffect(() => {
    void loadJobs()
  }, [loadJobs])

  return (
    <JobsTablePanel
      jobs={jobs}
      loading={jobsLoading}
      error={jobsError}
      onRetry={() => void loadJobs()}
    />
  )
}

function JobsTablePanel({
  jobs,
  loading,
  error,
  onRetry,
}: {
  jobs: JobListRow[]
  loading: boolean
  error: string | null
  onRetry: () => void
}) {
  const [downloadingJobId, setDownloadingJobId] = useState<number | null>(null)

  async function handleDownload(job: JobListRow) {
    if (!job.errata_path) return
    setDownloadingJobId(job.id)
    try {
      const url = await getErrataDownloadUrl(job.errata_path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not download errata.'
      toast.error('Download failed', { description: msg })
    } finally {
      setDownloadingJobId(null)
    }
  }

  return (
    <Card className="w-full md:w-3/4">
      <CardHeader>
        <CardTitle>Jobs</CardTitle>
        <CardDescription>
          Only jobs you own are shown (filtered by your account).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-destructive">
            <span>{error}</span>
            <Button type="button" size="sm" variant="outline" onClick={onRetry}>
              Retry
            </Button>
          </div>
        ) : null}
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading jobs…</p>
        ) : jobs.length === 0 ? (
          <p className="text-xs text-muted-foreground">No jobs yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-center">Status</TableHead>
                <TableHead>Transcript name</TableHead>
                <TableHead>Transcript size</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Ready Est.</TableHead>
                <TableHead>Ready</TableHead>
                <TableHead>Download Errata</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center justify-center">
                      <StatusIcon status={job.status} />
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[12rem] truncate">
                    {job.transcript_name}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatTranscriptSizeKb(job.transcript_size)}
                  </TableCell>
                  <TableCell>{formatDateCell(job.created_at)}</TableCell>
                  <TableCell>{formatDateCell(job.due_date)}</TableCell>
                  <TableCell>
                    {formatDateCell(job.ready_estimate_date)}
                  </TableCell>
                  <TableCell>{formatDateCell(job.ready_date)}</TableCell>
                  <TableCell>
                    {job.status.toLowerCase() === 'ready_for_download' &&
                    job.errata_path ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void handleDownload(job)}
                        disabled={downloadingJobId === job.id}
                      >
                        {downloadingJobId === job.id ? 'Preparing…' : 'Download Errata'}
                      </Button>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

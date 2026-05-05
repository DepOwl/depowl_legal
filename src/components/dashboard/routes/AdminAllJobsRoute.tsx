import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'

import { useDashboardOutlet } from '@/components/dashboard/useDashboardOutlet'
import { StatusIcon } from '@/components/dashboard/widgets/StatusIcon'
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
import { formatDateCell, formatTranscriptSizeKb } from '@/lib/format'
import { fetchAllJobs, getErrataDownloadUrl } from '@/lib/jobs'
import type { AdminJobListRow } from '@/types/job'

export function DashboardAllJobsRoute() {
  const { isAdmin, adminLoading } = useDashboardOutlet()

  if (adminLoading) {
    return (
      <p className="text-xs text-muted-foreground">Checking access…</p>
    )
  }
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return <AllJobsTablePanel />
}

function AllJobsTablePanel() {
  const [jobs, setJobs] = useState<AdminJobListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadingJobId, setDownloadingJobId] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const rows = await fetchAllJobs()
      setJobs(rows)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not load jobs.'
      setError(msg)
      toast.error('Failed to load all jobs', { description: msg })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleDownload(job: AdminJobListRow) {
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
        <CardTitle>All jobs</CardTitle>
        <CardDescription>
          Every job in the system (admin only). Owner email is shown when
          available.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-destructive">
            <span>{error}</span>
            <Button type="button" size="sm" variant="outline" onClick={() => void load()}>
              Retry
            </Button>
          </div>
        ) : null}
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading jobs…</p>
        ) : jobs.length === 0 ? (
          <p className="text-xs text-muted-foreground">No jobs yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Owner</TableHead>
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
                    <TableCell className="max-w-[10rem] truncate text-xs">
                      {job.owner_email ?? `${job.user_id.slice(0, 8)}…`}
                    </TableCell>
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
          </div>
        )}
      </CardContent>
    </Card>
  )
}

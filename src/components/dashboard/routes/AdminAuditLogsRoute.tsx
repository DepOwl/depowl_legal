import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { toast } from 'sonner'

import { useDashboardOutlet } from '@/components/dashboard/useDashboardOutlet'
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
import { fetchAuditLogs } from '@/lib/auditLogs'
import { formatDateTimeCell } from '@/lib/format'
import type { AuditLogRow } from '@/types/auditLog'

export function DashboardAuditLogsRoute() {
  const { isAdmin, adminLoading } = useDashboardOutlet()

  if (adminLoading) {
    return (
      <p className="text-xs text-muted-foreground">Checking access…</p>
    )
  }
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return <AuditLogsTablePanel />
}

function AuditLogsTablePanel() {
  const [rows, setRows] = useState<AuditLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAuditLogs()
      setRows(data)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not load audit logs.'
      setError(msg)
      toast.error('Failed to load audit logs', { description: msg })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <Card className="w-full max-w-6xl">
      <CardHeader>
        <CardTitle>Audit logs</CardTitle>
        <CardDescription>
          Recent security and data events (admin only). Includes Auth
          (sign-in/sign-out from the app, new auth users and profiles from
          database triggers) plus other events via log_audit_event.
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
          <p className="text-xs text-muted-foreground">Loading audit logs…</p>
        ) : rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">No audit log entries yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Event time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Record</TableHead>
                  <TableHead className="whitespace-nowrap">IP</TableHead>
                  <TableHead className="min-w-[12rem]">User agent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {formatDateTimeCell(row.event_time)}
                    </TableCell>
                    <TableCell className="max-w-[10rem] truncate font-mono text-xs">
                      {row.user_id ?? '—'}
                    </TableCell>
                    <TableCell className="max-w-[8rem] truncate text-xs">
                      {row.role ?? '—'}
                    </TableCell>
                    <TableCell className="max-w-[12rem] truncate text-xs">
                      {row.action}
                    </TableCell>
                    <TableCell className="max-w-[10rem] truncate text-xs">
                      {row.table_name ?? '—'}
                    </TableCell>
                    <TableCell className="max-w-[10rem] truncate font-mono text-xs">
                      {row.record_id ?? '—'}
                    </TableCell>
                    <TableCell className="max-w-[8rem] truncate text-xs">
                      {row.ip_address ?? '—'}
                    </TableCell>
                    <TableCell className="max-w-[18rem] truncate text-xs" title={row.user_agent ?? ''}>
                      {row.user_agent ?? '—'}
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

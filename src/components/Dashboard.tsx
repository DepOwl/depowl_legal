import { useCallback, useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Navigate,
  NavLink,
  Outlet,
  useLocation,
  useMatch,
  useNavigate,
  useOutletContext,
} from 'react-router-dom'
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
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { fetchCurrentUserIsAdmin } from '@/lib/admin'
import { createJob, fetchAllJobs, fetchMyJobs } from '@/lib/jobs'
import { getSupabase } from '@/lib/supabase'
import type { AdminJobListRow, JobListRow } from '@/types/job'

export type DashboardOutletContext = {
  user: User
  isAdmin: boolean
  adminLoading: boolean
}

function useDashboardOutlet() {
  return useOutletContext<DashboardOutletContext>()
}

function formatDateCell(value: string | null): string {
  if (!value) return '—'
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00`).toLocaleDateString()
  }
  return new Date(value).toLocaleDateString()
}

const createJobSchema = z.object({
  transcript_name: z.string().trim().min(1, 'Transcript name is required'),
  due_date: z.string().min(1, 'Due date is required'),
})

type CreateJobFormValues = z.infer<typeof createJobSchema>

function dashboardPageTitle(pathname: string): string {
  if (pathname.endsWith('/create')) return 'Create a job'
  if (pathname.endsWith('/all-jobs')) return 'All jobs'
  if (pathname.endsWith('/help')) return 'Request help'
  return 'Your jobs'
}

export function Dashboard({ user }: { user: User }) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminLoading, setAdminLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setAdminLoading(true)
      setIsAdmin(false)
      const v = await fetchCurrentUserIsAdmin()
      if (!cancelled) {
        setIsAdmin(v)
        setAdminLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user.id])

  const outletContext = useMemo<DashboardOutletContext>(
    () => ({ user, isAdmin, adminLoading }),
    [user, isAdmin, adminLoading],
  )

  const location = useLocation()
  const matchJobs = useMatch({ path: '/dashboard', end: true })
  const matchCreate = useMatch('/dashboard/create')
  const matchAllJobs = useMatch('/dashboard/all-jobs')
  const matchHelp = useMatch('/dashboard/help')

  async function handleSignOut() {
    const supabase = getSupabase()
    await supabase.auth.signOut()
    toast.success('Signed out')
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border px-2 py-3">
          <span className="truncate px-2 text-sm font-semibold">DepOwl</span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={!!matchJobs}>
                    <NavLink to="/dashboard" end>
                      Jobs
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={!!matchCreate}>
                    <NavLink to="/dashboard/create">Create a Job</NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {isAdmin ? (
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={!!matchAllJobs}>
                      <NavLink to="/dashboard/all-jobs">All Jobs</NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : null}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={!!matchHelp}>
                    <NavLink to="/dashboard/help">Help</NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border p-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => void handleSignOut()}
          >
            Sign out
          </Button>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <h2 className="text-sm font-medium">
            {dashboardPageTitle(location.pathname)}
          </h2>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <Outlet context={outletContext} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

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

export function DashboardCreateRoute() {
  const { user } = useDashboardOutlet()
  const navigate = useNavigate()

  return (
    <CreateJobPanel
      userId={user.id}
      onCreated={() => {
        navigate('/dashboard')
      }}
    />
  )
}

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

export function DashboardHelpRoute() {
  const { user } = useDashboardOutlet()
  return <HelpPanel userEmail={user.email ?? ''} />
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
  return (
    <Card>
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
                <TableHead>Status</TableHead>
                <TableHead>Transcript name</TableHead>
                <TableHead>Transcript size</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Ready</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>{job.status}</TableCell>
                  <TableCell className="max-w-[12rem] truncate">
                    {job.transcript_name}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {job.transcript_size != null ? job.transcript_size : '—'}
                  </TableCell>
                  <TableCell>{formatDateCell(job.created_at)}</TableCell>
                  <TableCell>{formatDateCell(job.due_date)}</TableCell>
                  <TableCell>{formatDateCell(job.ready_date)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function AllJobsTablePanel() {
  const [jobs, setJobs] = useState<AdminJobListRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  return (
    <Card>
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
                  <TableHead>Status</TableHead>
                  <TableHead>Transcript name</TableHead>
                  <TableHead>Transcript size</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Ready</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="max-w-[10rem] truncate text-xs">
                      {job.owner_email ?? `${job.user_id.slice(0, 8)}…`}
                    </TableCell>
                    <TableCell>{job.status}</TableCell>
                    <TableCell className="max-w-[12rem] truncate">
                      {job.transcript_name}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {job.transcript_size != null ? job.transcript_size : '—'}
                    </TableCell>
                    <TableCell>{formatDateCell(job.created_at)}</TableCell>
                    <TableCell>{formatDateCell(job.due_date)}</TableCell>
                    <TableCell>{formatDateCell(job.ready_date)}</TableCell>
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

function CreateJobPanel({
  userId,
  onCreated,
}: {
  userId: string
  onCreated: () => void
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateJobFormValues>({
    resolver: zodResolver(createJobSchema),
    defaultValues: {
      transcript_name: '',
      due_date: '',
    },
  })

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>New job</CardTitle>
        <CardDescription>
          Creates a job with transcript name and due date. Status, transcript
          size, and ready date are shown in the table when set elsewhere.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={handleSubmit(async (values) => {
            try {
              await createJob({
                user_id: userId,
                transcript_name: values.transcript_name.trim(),
                due_date: values.due_date,
              })
              toast.success('Job created')
              reset({
                transcript_name: '',
                due_date: '',
              })
              onCreated()
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'Could not create job.'
              toast.error('Create failed', { description: msg })
            }
          })}
        >
          <FieldGroup className="gap-4">
            <Field data-invalid={!!errors.transcript_name}>
              <FieldLabel htmlFor="job-transcript-name">
                Transcript name <span className="text-destructive">*</span>
              </FieldLabel>
              <FieldContent>
                <Input
                  id="job-transcript-name"
                  {...register('transcript_name')}
                  aria-invalid={!!errors.transcript_name}
                />
                <FieldError
                  errors={
                    errors.transcript_name
                      ? [errors.transcript_name]
                      : undefined
                  }
                />
              </FieldContent>
            </Field>

            <Field data-invalid={!!errors.due_date}>
              <FieldLabel htmlFor="job-due">
                Due date <span className="text-destructive">*</span>
              </FieldLabel>
              <FieldContent>
                <Input id="job-due" type="date" {...register('due_date')} />
                <FieldError
                  errors={errors.due_date ? [errors.due_date] : undefined}
                />
              </FieldContent>
            </Field>
          </FieldGroup>

          <Button type="submit" className="mt-6 w-full sm:w-auto" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create job'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function HelpPanel({ userEmail }: { userEmail: string }) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Request help</CardTitle>
        <CardDescription>
          Describe what you need. We will follow up at{' '}
          {userEmail || 'the email on your account'}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field>
          <FieldLabel htmlFor="help-message">Message</FieldLabel>
          <FieldContent>
            <Textarea
              id="help-message"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What do you need help with?"
            />
          </FieldContent>
        </Field>
        <Button
          type="button"
          disabled={sending || !message.trim()}
          onClick={() => {
            setSending(true)
            try {
              toast.success('Request sent', {
                description:
                  'Thanks — our team will review your message and respond soon.',
              })
              setMessage('')
            } finally {
              setSending(false)
            }
          }}
        >
          {sending ? 'Sending…' : 'Submit request'}
        </Button>
      </CardContent>
    </Card>
  )
}

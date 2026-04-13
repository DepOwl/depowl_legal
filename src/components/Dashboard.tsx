import { useCallback, useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { Controller, useForm } from 'react-hook-form'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { fetchCurrentUserIsAdmin } from '@/lib/admin'
import {
  MAX_JOB_PDF_BYTES,
  createJob,
  fetchAllJobs,
  fetchMyJobs,
  uploadErrataForJob,
} from '@/lib/jobs'
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

function formatTranscriptSizeKb(value: number | null): string {
  if (value == null) return '—'
  return `${(value / 1024).toFixed(2)} KB`
}

const pdfFileSchema = z
  .custom<File | undefined>((v) => v === undefined || v instanceof File)
  .optional()
  .refine((f) => f == null || f.size <= MAX_JOB_PDF_BYTES, {
    message: 'PDF must be at most 25 MB',
  })
  .refine(
    (f) =>
      f == null ||
      f.name.toLowerCase().endsWith('.pdf') ||
      f.type === 'application/pdf' ||
      f.type === '',
    { message: 'Only PDF files are allowed' },
  )

const createJobSchema = z.object({
  transcript_name: z.string().trim().min(1, 'Transcript name is required'),
  due_date: z.string().min(1, 'Due date is required'),
  pdf_file: pdfFileSchema,
})

type CreateJobFormValues = z.infer<typeof createJobSchema>

const uploadErrataSchema = z
  .object({
    job_id: z.string().min(1, 'Select a job'),
    pdf_file: z.custom<File | undefined>(
      (v) => v === undefined || v instanceof File,
    ),
  })
  .superRefine((data, ctx) => {
    const f = data.pdf_file
    if (f == null || !(f instanceof File)) {
      ctx.addIssue({
        code: 'custom',
        message: 'PDF is required',
        path: ['pdf_file'],
      })
      return
    }
    if (f.size > MAX_JOB_PDF_BYTES) {
      ctx.addIssue({
        code: 'custom',
        message: 'PDF must be at most 25 MB',
        path: ['pdf_file'],
      })
      return
    }
    if (
      !f.name.toLowerCase().endsWith('.pdf') &&
      f.type !== 'application/pdf' &&
      f.type !== ''
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Only PDF files are allowed',
        path: ['pdf_file'],
      })
    }
  })

type UploadErrataFormValues = z.infer<typeof uploadErrataSchema>

function dashboardPageTitle(pathname: string): string {
  if (pathname.endsWith('/create')) return 'Create a job'
  if (pathname.endsWith('/all-jobs')) return 'All jobs'
  if (pathname.endsWith('/upload-errata')) return 'Upload errata PDF'
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
  const matchUploadErrata = useMatch('/dashboard/upload-errata')
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
                  <>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={!!matchAllJobs}>
                        <NavLink to="/dashboard/all-jobs">All Jobs</NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={!!matchUploadErrata}
                      >
                        <NavLink to="/dashboard/upload-errata">
                          Upload Errata PDF
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
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

export function DashboardUploadErrataRoute() {
  const { isAdmin, adminLoading } = useDashboardOutlet()

  if (adminLoading) {
    return (
      <p className="text-xs text-muted-foreground">Checking access…</p>
    )
  }
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return <UploadErrataPanel />
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
                    {formatTranscriptSizeKb(job.transcript_size)}
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
                      {formatTranscriptSizeKb(job.transcript_size)}
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

function UploadErrataPanel() {
  const [jobs, setJobs] = useState<AdminJobListRow[]>([])
  const [loadingJobs, setLoadingJobs] = useState(true)
  const [jobsError, setJobsError] = useState<string | null>(null)
  const [pdfInputKey, setPdfInputKey] = useState(0)

  const loadJobs = useCallback(async () => {
    setLoadingJobs(true)
    setJobsError(null)
    try {
      const rows = await fetchAllJobs()
      setJobs(rows)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not load jobs.'
      setJobsError(msg)
      toast.error('Failed to load jobs', { description: msg })
    } finally {
      setLoadingJobs(false)
    }
  }, [])

  useEffect(() => {
    void loadJobs()
  }, [loadJobs])

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UploadErrataFormValues>({
    resolver: zodResolver(uploadErrataSchema),
    defaultValues: {
      job_id: '',
      pdf_file: undefined,
    },
  })

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Upload errata PDF</CardTitle>
        <CardDescription>
          Choose a job and upload an errata PDF. The job status will be set to
          ready for download and the file stored for the job owner.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {jobsError ? (
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-destructive">
            <span>{jobsError}</span>
            <Button type="button" size="sm" variant="outline" onClick={() => void loadJobs()}>
              Retry
            </Button>
          </div>
        ) : null}
        {loadingJobs ? (
          <p className="text-xs text-muted-foreground">Loading jobs…</p>
        ) : jobs.length === 0 ? (
          <p className="text-xs text-muted-foreground">No jobs to attach errata to.</p>
        ) : (
          <form
            className="space-y-4"
            onSubmit={handleSubmit(async (values) => {
              const jobId = Number.parseInt(values.job_id, 10)
              if (Number.isNaN(jobId)) {
                toast.error('Invalid job')
                return
              }
              try {
                const file = values.pdf_file
                if (!(file instanceof File)) {
                  return
                }
                await uploadErrataForJob({
                  jobId,
                  file,
                })
                toast.success('Errata uploaded', {
                  description: 'Job status updated to ready for download.',
                })
                reset({
                  job_id: '',
                  pdf_file: undefined,
                })
                setPdfInputKey((k) => k + 1)
                void loadJobs()
              } catch (e) {
                const msg =
                  e instanceof Error ? e.message : 'Could not upload errata.'
                toast.error('Upload failed', { description: msg })
              }
            })}
          >
            <FieldGroup className="gap-4">
              <Field data-invalid={!!errors.job_id}>
                <FieldLabel htmlFor="errata-job">Job</FieldLabel>
                <FieldContent>
                  <Controller
                    control={control}
                    name="job_id"
                    render={({ field }) => (
                      <Select
                        value={field.value || undefined}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger
                          id="errata-job"
                          className="h-9 w-full max-w-full min-w-0"
                          aria-invalid={!!errors.job_id}
                        >
                          <SelectValue placeholder="Select a job" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="w-[min(100vw-2rem,var(--radix-select-trigger-width))]">
                          {jobs.map((job) => (
                            <SelectItem key={job.id} value={String(job.id)}>
                              #{job.id} — {job.transcript_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError
                    errors={errors.job_id ? [errors.job_id] : undefined}
                  />
                </FieldContent>
              </Field>

              <Field data-invalid={!!errors.pdf_file}>
                <FieldLabel htmlFor="errata-pdf">
                  Errata PDF <span className="text-destructive">*</span>
                </FieldLabel>
                <FieldContent>
                  <Controller
                    key={pdfInputKey}
                    control={control}
                    name="pdf_file"
                    render={({ field: { onChange, onBlur, name, ref } }) => (
                      <Input
                        id="errata-pdf"
                        ref={ref}
                        name={name}
                        onBlur={onBlur}
                        type="file"
                        accept="application/pdf,.pdf"
                        className="cursor-pointer file:cursor-pointer"
                        onChange={(e) =>
                          onChange(e.target.files?.[0] ?? undefined)
                        }
                      />
                    )}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    PDF only, up to 25 MB.
                  </p>
                  <FieldError
                    errors={errors.pdf_file ? [errors.pdf_file] : undefined}
                  />
                </FieldContent>
              </Field>
            </FieldGroup>

            <Button type="submit" className="mt-6 w-full sm:w-auto" disabled={isSubmitting}>
              {isSubmitting ? 'Uploading…' : 'Upload errata'}
            </Button>
          </form>
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
  const [pdfInputKey, setPdfInputKey] = useState(0)

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateJobFormValues>({
    resolver: zodResolver(createJobSchema),
    defaultValues: {
      transcript_name: '',
      due_date: '',
      pdf_file: undefined,
    },
  })

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>New job</CardTitle>
        <CardDescription>
          Add a transcript name and due date. You can optionally attach a PDF
          (stored in Supabase Storage). Status and ready date still come from
          elsewhere.
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
                file: values.pdf_file,
              })
              toast.success('Job created')
              reset({
                transcript_name: '',
                due_date: '',
                pdf_file: undefined,
              })
              setPdfInputKey((k) => k + 1)
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

            <Field data-invalid={!!errors.pdf_file}>
              <FieldLabel htmlFor="job-pdf">Transcript PDF (optional)</FieldLabel>
              <FieldContent>
                <Controller
                  key={pdfInputKey}
                  control={control}
                  name="pdf_file"
                  render={({ field: { onChange, onBlur, name, ref } }) => (
                    <Input
                      id="job-pdf"
                      ref={ref}
                      name={name}
                      onBlur={onBlur}
                      type="file"
                      accept="application/pdf,.pdf"
                      className="cursor-pointer file:cursor-pointer"
                      onChange={(e) =>
                        onChange(e.target.files?.[0] ?? undefined)
                      }
                    />
                  )}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  PDF only, up to 25 MB.
                </p>
                <FieldError
                  errors={errors.pdf_file ? [errors.pdf_file] : undefined}
                />
              </FieldContent>
            </Field>
          </FieldGroup>

          <Button type="submit" className="mt-6 w-full sm:w-auto" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Create job'}
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

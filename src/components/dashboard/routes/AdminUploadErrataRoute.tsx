import { useCallback, useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Navigate } from 'react-router-dom'
import * as z from 'zod'
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
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MAX_JOB_PDF_BYTES, fetchAllJobs, uploadErrataForJob } from '@/lib/jobs'
import type { AdminJobListRow } from '@/types/job'

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
    <Card className="w-full max-w-3xl">
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

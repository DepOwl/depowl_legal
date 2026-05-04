import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
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
import { Textarea } from '@/components/ui/textarea'
import { MAX_JOB_PDF_BYTES, createJob } from '@/lib/jobs'

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

export function DashboardHelpRoute() {
  const { user } = useDashboardOutlet()
  return <HelpPanel userEmail={user.email ?? ''} />
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
    <Card className="w-full max-w-3xl">
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
    <Card className="w-full max-w-3xl">
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

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { Button } from '@/components/ui/button'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { signUpWithUserProfile } from '@/lib/signUpUser'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export const signUpFormSchema = z.object({
  first_name: z.string().trim().min(1, 'First name is required'),
  last_name: z.string().trim().min(1, 'Last name is required'),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters'),
  organization: z.string().trim(),
  csr_num: z.string().trim(),
  notes: z.string().trim(),
})

export type SignUpFormValues = z.infer<typeof signUpFormSchema>

const defaultValues: SignUpFormValues = {
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  organization: '',
  csr_num: '',
  notes: '',
}

export type SignUpFormProps = {
  className?: string
  onSuccess?: (info: { needsEmailConfirmation: boolean }) => void
}

export function SignUpForm({ className, onSuccess }: SignUpFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpFormSchema),
    defaultValues,
  })

  return (
    <form
      className={cn('w-full max-w-md space-y-6', className)}
      onSubmit={handleSubmit(async (values) => {
        setSubmitError(null)
        try {
          const org = values.organization.trim()
          const csr = values.csr_num.trim()
          const notes = values.notes.trim()
          const { needsEmailConfirmation } = await signUpWithUserProfile({
            first_name: values.first_name.trim(),
            last_name: values.last_name.trim(),
            email: values.email.trim(),
            password: values.password,
            ...(org !== '' ? { organization: org } : {}),
            ...(csr !== '' ? { csr_num: csr } : {}),
            ...(notes !== '' ? { notes } : {}),
          })

          const description = needsEmailConfirmation
            ? 'Check your email to confirm your account before signing in.'
            : 'Your account and profile have been created.'
          toast.success('Sign up successful', { description })

          reset({ ...defaultValues })
          onSuccess?.({ needsEmailConfirmation })
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Something went wrong. Please try again.'
          setSubmitError(message)
          toast.error('Sign up failed', { description: message })
        }
      })}
      noValidate
    >
      <FieldSet className="space-y-4">
        <FieldLegend variant="legend">Create your account</FieldLegend>
        <p className="text-xs/relaxed text-muted-foreground">
          Profile data is saved to your users row in Supabase after Auth sign-up.
        </p>

        <FieldGroup className="gap-4">
          <Field data-invalid={!!errors.first_name}>
            <FieldLabel htmlFor="signup-first-name">
              First name <span className="text-destructive">*</span>
            </FieldLabel>
            <FieldContent>
              <Input
                id="signup-first-name"
                type="text"
                autoComplete="given-name"
                aria-required={true}
                aria-invalid={!!errors.first_name}
                placeholder="Jane"
                {...register('first_name')}
              />
              <FieldError
                errors={errors.first_name ? [errors.first_name] : undefined}
              />
            </FieldContent>
          </Field>

          <Field data-invalid={!!errors.last_name}>
            <FieldLabel htmlFor="signup-last-name">
              Last name <span className="text-destructive">*</span>
            </FieldLabel>
            <FieldContent>
              <Input
                id="signup-last-name"
                type="text"
                autoComplete="family-name"
                aria-required={true}
                aria-invalid={!!errors.last_name}
                placeholder="Doe"
                {...register('last_name')}
              />
              <FieldError
                errors={errors.last_name ? [errors.last_name] : undefined}
              />
            </FieldContent>
          </Field>

          <Field data-invalid={!!errors.email}>
            <FieldLabel htmlFor="signup-email">
              Email <span className="text-destructive">*</span>
            </FieldLabel>
            <FieldContent>
              <Input
                id="signup-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                aria-required={true}
                aria-invalid={!!errors.email}
                placeholder="you@example.com"
                {...register('email')}
              />
              <FieldError errors={errors.email ? [errors.email] : undefined} />
            </FieldContent>
          </Field>

          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor="signup-password">
              Password <span className="text-destructive">*</span>
            </FieldLabel>
            <FieldContent>
              <Input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                aria-required={true}
                aria-invalid={!!errors.password}
                placeholder="At least 8 characters"
                {...register('password')}
              />
              <FieldDescription>
                Used for Supabase Auth only, not stored as plain text in your
                profile table.
              </FieldDescription>
              <FieldError
                errors={errors.password ? [errors.password] : undefined}
              />
            </FieldContent>
          </Field>

          <Field data-invalid={!!errors.organization}>
            <FieldLabel htmlFor="signup-organization">Organization</FieldLabel>
            <FieldContent>
              <Input
                id="signup-organization"
                type="text"
                autoComplete="organization"
                aria-invalid={!!errors.organization}
                placeholder="Company or firm name"
                {...register('organization')}
              />
              <FieldError
                errors={
                  errors.organization ? [errors.organization] : undefined
                }
              />
            </FieldContent>
          </Field>

          <Field data-invalid={!!errors.csr_num}>
            <FieldLabel htmlFor="signup-cr-number">
              Court reporter number
            </FieldLabel>
            <FieldContent>
              <Input
                id="signup-cr-number"
                type="text"
                aria-invalid={!!errors.csr_num}
                placeholder="Optional"
                {...register('csr_num')}
              />
              <FieldDescription>
                Optional. Uniqueness should be enforced in the database.
              </FieldDescription>
              <FieldError
                errors={errors.csr_num ? [errors.csr_num] : undefined}
              />
            </FieldContent>
          </Field>

          <Field data-invalid={!!errors.notes}>
            <FieldLabel htmlFor="signup-notes">Notes</FieldLabel>
            <FieldContent>
              <Textarea
                id="signup-notes"
                aria-invalid={!!errors.notes}
                placeholder="Anything else we should know (optional)"
                rows={4}
                {...register('notes')}
              />
              <FieldError errors={errors.notes ? [errors.notes] : undefined} />
            </FieldContent>
          </Field>
        </FieldGroup>
      </FieldSet>

      {submitError ? (
        <p className="text-xs/relaxed text-destructive" role="alert">
          {submitError}
        </p>
      ) : null}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Signing up…' : 'Sign up'}
      </Button>
    </form>
  )
}

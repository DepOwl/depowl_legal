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
import { cn } from '@/lib/utils'

/**
 * Client-side validation only. Uniqueness of `cr_number` must be enforced by your API when creating the user.
 */
export const signUpFormSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Enter a valid email address'),
  organization: z.string().trim(),
  cr_number: z.string().trim(),
  notes: z.string().trim(),
})

export type SignUpFormValues = z.infer<typeof signUpFormSchema>

/** Values after submit: optional fields omitted when empty (for API payloads). */
export type SignUpFormSubmitData = Pick<SignUpFormValues, 'name' | 'email'> & {
  organization?: string
  cr_number?: string
  notes?: string
}

const defaultValues: SignUpFormValues = {
  name: '',
  email: '',
  organization: '',
  cr_number: '',
  notes: '',
}

export type SignUpFormProps = {
  className?: string
  /** Called with validated values; create the user from your backend here. */
  onValidSubmit?: (data: SignUpFormSubmitData) => void | Promise<void>
}

function toSubmitData(values: SignUpFormValues): SignUpFormSubmitData {
  const organization = values.organization.trim()
  const cr_number = values.cr_number.trim()
  const notes = values.notes.trim()
  return {
    name: values.name,
    email: values.email,
    ...(organization !== '' ? { organization } : {}),
    ...(cr_number !== '' ? { cr_number } : {}),
    ...(notes !== '' ? { notes } : {}),
  }
}

export function SignUpForm({ className, onValidSubmit }: SignUpFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
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
        const payload = toSubmitData(values)
        try {
          await onValidSubmit?.(payload)
        } catch {
          setSubmitError('Something went wrong. Please try again.')
        }
      })}
      noValidate
    >
      <FieldSet className="space-y-4">
        <FieldLegend variant="legend">Create your account</FieldLegend>
        <p className="text-xs/relaxed text-muted-foreground">
          Public sign-up — user records are created after you submit valid
          information.
        </p>

        <FieldGroup className="gap-4">
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="signup-name">
              Name <span className="text-destructive">*</span>
            </FieldLabel>
            <FieldContent>
              <Input
                id="signup-name"
                type="text"
                autoComplete="name"
                aria-required={true}
                aria-invalid={!!errors.name}
                placeholder="Jane Doe"
                {...register('name')}
              />
              <FieldError errors={errors.name ? [errors.name] : undefined} />
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

          <Field data-invalid={!!errors.cr_number}>
            <FieldLabel htmlFor="signup-cr-number">
              Court reporter number
            </FieldLabel>
            <FieldContent>
              <Input
                id="signup-cr-number"
                type="text"
                aria-invalid={!!errors.cr_number}
                placeholder="Optional"
                {...register('cr_number')}
              />
              <FieldDescription>
                Optional. If provided, each user must use a unique number — your
                server should reject duplicates when creating the account.
              </FieldDescription>
              <FieldError
                errors={errors.cr_number ? [errors.cr_number] : undefined}
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

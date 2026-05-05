import { useState } from 'react'
import {
  type FieldErrors,
  type UseFormRegister,
  useForm,
  useWatch,
} from 'react-hook-form'
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
import { CheckCircleIcon } from '@heroicons/react/24/outline'
import { toast } from 'sonner'

/** Step 1 — runs before step 2 */
export const signUpStep1Schema = z.object({
  full_name: z.string().trim().min(1, 'Full name is required'),
  csr_num: z.string().trim(),
})

/** Step 2 — after step 1 */
export const signUpStep2Schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Za-z]/, 'Password must include at least one letter')
    .regex(
      /[^A-Za-z0-9]/,
      'Password must include at least one special character',
    ),
})

/** Step 3 — after step 2 */
export const signUpStep3Schema = z.object({
  organization: z.string().trim(),
  notes: z.string().trim(),
})

export const signUpSchema = signUpStep1Schema
  .merge(signUpStep2Schema)
  .merge(signUpStep3Schema)

export type SignUpSchema = z.infer<typeof signUpSchema>
export type SignUpFormValues = SignUpSchema

const STEP_1_FIELDS = ['full_name', 'csr_num'] as const satisfies ReadonlyArray<
  keyof SignUpFormValues
>
const STEP_2_FIELDS = ['email', 'password'] as const satisfies ReadonlyArray<
  keyof SignUpFormValues
>
const STEP_3_FIELDS = ['organization', 'notes'] as const satisfies ReadonlyArray<
  keyof SignUpFormValues
>

const STEP_FIELD_GROUPS = [STEP_1_FIELDS, STEP_2_FIELDS, STEP_3_FIELDS] as const

const defaultValues: SignUpFormValues = {
  full_name: '',
  csr_num: '',
  email: '',
  password: '',
  organization: '',
  notes: '',
}

export type SignUpFormProps = {
  className?: string
  onSuccess?: (info: { needsEmailConfirmation: boolean }) => void
}

const STEP_COUNT = STEP_FIELD_GROUPS.length

type StepFieldsProps = {
  register: UseFormRegister<SignUpFormValues>
  errors: FieldErrors<SignUpFormValues>
  isSubmitting: boolean
}

type Step1Props = StepFieldsProps & {
  onNext: () => Promise<void>
}

function Step1Fields({ register, errors, isSubmitting, onNext }: Step1Props) {
  return (
    <div className="space-y-4">
      <p className="text-xs/relaxed text-muted-foreground">
        Tell us who you are. We use this to personalize your account profile.
      </p>
      <Field data-invalid={!!errors.full_name}>
        <FieldLabel htmlFor="signup-full-name">
          Full name <span className="text-destructive">*</span>
        </FieldLabel>
        <FieldContent>
          <Input
            id="signup-full-name"
            type="text"
            autoComplete="name"
            aria-required={true}
            aria-invalid={!!errors.full_name}
            placeholder="Jane Doe"
            {...register('full_name')}
          />
          <FieldError errors={errors.full_name ? [errors.full_name] : undefined} />
        </FieldContent>
      </Field>

      <Field data-invalid={!!errors.csr_num}>
        <FieldLabel htmlFor="signup-cr-number">Court reporter number</FieldLabel>
        <FieldContent>
          <Input
            id="signup-cr-number"
            type="text"
            aria-invalid={!!errors.csr_num}
            placeholder="Optional"
            {...register('csr_num')}
          />
          <FieldDescription>
            Your court reporter number is optional.
          </FieldDescription>
          <FieldError errors={errors.csr_num ? [errors.csr_num] : undefined} />
        </FieldContent>
      </Field>

      <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
        <Button
          type="button"
          className="w-full sm:w-auto"
          disabled={isSubmitting}
          onClick={onNext}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

type Step2Props = StepFieldsProps & {
  onBack: () => void
  onNext: () => Promise<void>
}

function Step2Fields({
  register,
  errors,
  isSubmitting,
  onBack,
  onNext,
}: Step2Props) {
  return (
    <div className="space-y-4">
      <p className="text-xs/relaxed text-muted-foreground">
        Set your sign-in credentials. Passwords are only used by Supabase Auth.
      </p>
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
            Use 8+ characters with at least one letter and one special character.
          </FieldDescription>
          <FieldError errors={errors.password ? [errors.password] : undefined} />
        </FieldContent>
      </Field>

      <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-between sm:gap-3">
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          disabled={isSubmitting}
          onClick={onBack}
        >
          Back
        </Button>
        <Button
          type="button"
          className="w-full sm:ml-auto sm:w-auto"
          disabled={isSubmitting}
          onClick={onNext}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

type Step3Props = StepFieldsProps & {
  onBack: () => void
  submitDisabled: boolean
}

function Step3Fields({
  register,
  errors,
  isSubmitting,
  onBack,
  submitDisabled,
}: Step3Props) {
  return (
    <div className="space-y-4">
      <p className="text-xs/relaxed text-muted-foreground">
        Add optional organization details and notes to complete onboarding.
      </p>
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
            errors={errors.organization ? [errors.organization] : undefined}
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

      <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-between sm:gap-3">
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          disabled={isSubmitting}
          onClick={onBack}
        >
          Back
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || submitDisabled}
          className="w-full sm:ml-auto sm:w-auto"
        >
          {isSubmitting ? 'Signing up…' : 'Sign up'}
        </Button>
      </div>
    </div>
  )
}

export function SignUpForm({ className, onSuccess }: SignUpFormProps) {
  const [step, setStep] = useState(0)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const {
    register,
    control,
    handleSubmit,
    reset,
    trigger,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues,
    mode: 'onChange',
  })

  const watched = useWatch({ control, defaultValue: defaultValues })

  const fullFormValid = signUpSchema.safeParse(watched ?? defaultValues).success

  const currentStepIndex = step + 1
  const stepFields = STEP_FIELD_GROUPS[step]

  function goToStep(nextStep: number) {
    setStep(nextStep)
    const activeFields = new Set(STEP_FIELD_GROUPS[nextStep])
    const fieldsToClear = (
      ['full_name', 'csr_num', 'email', 'password', 'organization', 'notes'] as const
    ).filter((name) => !activeFields.has(name))
    clearErrors(fieldsToClear)
  }

  async function handleNext() {
    const ok = await trigger([...stepFields])
    if (ok) goToStep(step + 1)
  }

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
            full_name: values.full_name.trim(),
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
          setStep(0)
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

        <div className="space-y-3">
          <div className="flex items-center gap-3" aria-label="Onboarding steps">
            <ol className="flex min-w-0 flex-1 items-center">
              {([1, 2, 3] as const).map((n) => {
                const active = currentStepIndex === n
                const complete = currentStepIndex > n
                return (
                  <li key={n} className="flex min-w-0 flex-1 items-center">
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold tabular-nums transition-colors',
                        active &&
                          'border-blue-600 bg-blue-600 text-white shadow-sm',
                        complete &&
                          !active &&
                          'border-emerald-500 bg-emerald-500 text-white shadow-sm',
                        !active &&
                          !complete &&
                          'border-border bg-muted/20 text-muted-foreground',
                      )}
                      aria-current={active ? 'step' : undefined}
                    >
                      {complete ? (
                        <CheckCircleIcon className="size-5 text-white" strokeWidth={2.25} aria-hidden />
                      ) : (
                        n
                      )}
                    </div>
                    {n < STEP_COUNT ? (
                      <span
                        className={cn(
                          'mx-2 h-px flex-1 bg-border/70',
                          complete && 'bg-emerald-400',
                        )}
                        aria-hidden
                      />
                    ) : null}
                  </li>
                )
              })}
            </ol>
            <p className="w-20 text-sm font-semibold leading-tight text-foreground">
              Step {currentStepIndex}
              <br />
              <span className="text-muted-foreground">of {STEP_COUNT}</span>
            </p>
          </div>
        </div>

        <FieldGroup className="gap-4">
          {step === 0 ? (
            <Step1Fields
              register={register}
              errors={errors}
              isSubmitting={isSubmitting}
              onNext={handleNext}
            />
          ) : null}
          {step === 1 ? (
            <Step2Fields
              register={register}
              errors={errors}
              isSubmitting={isSubmitting}
              onBack={() => goToStep(0)}
              onNext={handleNext}
            />
          ) : null}
          {step === 2 ? (
            <Step3Fields
              register={register}
              errors={errors}
              isSubmitting={isSubmitting}
              onBack={() => goToStep(1)}
              submitDisabled={!fullFormValid}
            />
          ) : null}
        </FieldGroup>
      </FieldSet>

      {submitError ? (
        <p className="text-xs/relaxed text-destructive" role="alert">
          {submitError}
        </p>
      ) : null}

    </form>
  )
}

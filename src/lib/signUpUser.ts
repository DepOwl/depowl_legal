import { getSupabase } from '@/lib/supabase'

export type SignUpUserInput = {
  first_name: string
  last_name: string
  email: string
  password: string
  organization?: string
  csr_num?: string
  notes?: string
}

function friendlyError(message: string): string {
  if (/duplicate|unique|already registered/i.test(message)) {
    return 'An account with this email may already exist. Try signing in instead.'
  }
  return message
}

/**
 * Supabase Auth sign-up, then insert into `public.users`.
 * Requires RLS policies that allow authenticated users to insert their own row
 * (see supabase/migrations). If email confirmation returns no session, the
 * profile insert is skipped; use the optional trigger in that migration or
 * disable email confirmation for local testing.
 */
export async function signUpWithUserProfile(
  input: SignUpUserInput
): Promise<{ needsEmailConfirmation: boolean }> {
  const supabase = getSupabase()

  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        first_name: input.first_name,
        last_name: input.last_name,
        organization: input.organization ?? null,
        csr_num: input.csr_num ?? null,
        notes: input.notes ?? null,
      },
    },
  })

  if (signUpError) {
    throw new Error(friendlyError(signUpError.message))
  }

  const user = authData.user
  if (!user) {
    throw new Error('Sign-up did not return a user. Check your Supabase Auth settings.')
  }

  const roleId = import.meta.env.VITE_DEFAULT_ROLE_ID?.trim()
  const row: {
    user_id: string
    email: string
    first_name: string
    last_name: string
    organization?: string
    csr_num?: string
    notes?: string
    role_id?: string
  } = {
    user_id: user.id,
    email: input.email,
    first_name: input.first_name,
    last_name: input.last_name,
  }

  if (input.organization) row.organization = input.organization
  if (input.csr_num) row.csr_num = input.csr_num
  if (input.notes) row.notes = input.notes
  if (roleId) row.role_id = roleId

  if (!authData.session) {
    return { needsEmailConfirmation: true }
  }

  const { error: insertError } = await supabase.from('users').insert(row)

  if (insertError) {
    throw new Error(friendlyError(insertError.message))
  }

  return { needsEmailConfirmation: false }
}

import { getSupabase } from '@/lib/supabase'

export type SignUpUserInput = {
  full_name: string
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
 * Supabase Auth sign-up, then upsert into `public.users`.
 *
 * If Auth returns "User already registered" — which happens when a prior
 * attempt succeeded at the Auth layer but failed at the profile-insert step —
 * the function falls back to sign-in with the provided credentials and upserts
 * the profile row, so the account can be fully created on retry.
 *
 * Requires RLS policies that allow authenticated users to insert their own row
 * (see supabase/migrations). The insert policy enforces role_id IS NULL on
 * self-signup; role assignment is admin-only. If email confirmation returns no
 * session, the profile insert is skipped; use the optional trigger in that
 * migration or disable email confirmation for local testing.
 */
export async function signUpWithUserProfile(
  input: SignUpUserInput,
): Promise<{ needsEmailConfirmation: boolean }> {
  const supabase = getSupabase()

  let userId: string
  let hasSession: boolean

  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: input.full_name,
        organization: input.organization ?? null,
        csr_num: input.csr_num ?? null,
        notes: input.notes ?? null,
      },
    },
  })

  if (signUpError) {
    // If Auth already has this account (leftover from a prior partial failure),
    // attempt sign-in with the same credentials and continue to profile upsert.
    if (/already registered/i.test(signUpError.message)) {
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      })
      if (signInError || !signInData.user) {
        // Wrong password or other sign-in error: surface the sign-in message so
        // the user knows why authentication failed rather than seeing a stale
        // "already registered" message. If sign-in returned no error but also
        // no user (unexpected Supabase state), tell the user to contact support.
        throw new Error(
          signInError
            ? friendlyError(signInError.message)
            : 'Sign-in succeeded but returned no user. Please contact support.',
        )
      }
      userId = signInData.user.id
      hasSession = !!signInData.session
    } else {
      throw new Error(friendlyError(signUpError.message))
    }
  } else {
    const user = authData.user
    if (!user) {
      throw new Error('Sign-up did not return a user. Check your Supabase Auth settings.')
    }
    userId = user.id
    hasSession = !!authData.session
  }

  if (!hasSession) {
    return { needsEmailConfirmation: true }
  }

  // role_id is intentionally omitted: the RLS insert policy requires role_id
  // IS NULL on self-signup; role assignment is an admin-only operation.
  const row: {
    user_id: string
    email: string
    full_name: string
    organization?: string
    csr_num?: string
    notes?: string
  } = {
    user_id: userId,
    email: input.email,
    full_name: input.full_name,
  }

  if (input.organization) row.organization = input.organization
  if (input.csr_num) row.csr_num = input.csr_num
  if (input.notes) row.notes = input.notes

  // onConflict uses the primary-key column name as PostgREST expects column
  // names (not constraint names). ignoreDuplicates: true → ON CONFLICT DO
  // NOTHING, so a second call for an already-complete profile is a no-op
  // rather than an error.
  const { error: upsertError } = await supabase
    .from('users')
    .upsert(row, { onConflict: 'user_id', ignoreDuplicates: true })

  if (upsertError) {
    throw new Error(friendlyError(upsertError.message))
  }

  return { needsEmailConfirmation: false }
}

import { getSupabase } from '@/lib/supabase'

/** Matches `public.current_user_is_admin()` in Supabase (roles.name case-insensitive `admin`). */
export async function fetchCurrentUserIsAdmin(): Promise<boolean> {
  const supabase = getSupabase()
  const { data, error } = await supabase.rpc('current_user_is_admin')
  if (error) {
    return false
  }
  return data === true
}

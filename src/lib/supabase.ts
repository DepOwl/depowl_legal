import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

/**
 * Browser-safe Supabase client (anon key only). Enforce access with Postgres RLS.
 * Do not use the service_role key in the Vite app.
 */
export function getSupabase(): SupabaseClient {
  if (client) {
    return client
  }

  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      'Supabase is not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env (see .env.example).'
    )
  }

  client = createClient(url, anonKey)
  return client
}

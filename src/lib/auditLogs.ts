import { getSupabase } from '@/lib/supabase'
import type { AuditLogRow } from '@/types/auditLog'

const PAGE_SIZE = 200

function clientUserAgent(): string | null {
  if (typeof navigator === 'undefined' || !navigator.userAgent) return null
  return navigator.userAgent
}

/** Writes one row via `public.log_audit_event` (RLS-safe). */
export async function logAuditEventFromClient(args: {
  action: string
  table_name?: string | null
  record_id?: string | null
  ip_address?: string | null
}): Promise<{ ok: boolean; errorMessage: string | null }> {
  const supabase = getSupabase()
  const { error } = await supabase.rpc('log_audit_event', {
    p_action: args.action,
    p_table_name: args.table_name ?? null,
    p_record_id: args.record_id ?? null,
    p_ip_address: args.ip_address ?? null,
    p_user_agent: clientUserAgent(),
  })
  if (error) {
    return { ok: false, errorMessage: error.message }
  }
  return { ok: true, errorMessage: null }
}

export async function fetchAuditLogs(): Promise<AuditLogRow[]> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('audit_logs')
    .select(
      'id,event_time,user_id,role,action,table_name,record_id,ip_address,user_agent',
    )
    .order('event_time', { ascending: false })
    .limit(PAGE_SIZE)

  if (error) {
    throw new Error(error.message)
  }
  return (data ?? []) as AuditLogRow[]
}

export type AuditLogRow = {
  id: number
  event_time: string
  user_id: string | null
  role: string | null
  action: string
  table_name: string | null
  record_id: string | null
  ip_address: string | null
  user_agent: string | null
}

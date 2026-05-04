/** Pure display helpers (module scope) for tables and cells. */

export function formatDateCell(value: string | null): string {
  if (!value) return '—'
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T12:00:00`).toLocaleDateString()
  }
  return new Date(value).toLocaleDateString()
}

export function formatDateTimeCell(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

export function formatTranscriptSizeKb(value: number | null): string {
  if (value == null) return '—'
  return `${(value / 1024).toFixed(2)} KB`
}

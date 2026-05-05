import * as z from 'zod'
import {
  ArrowPathIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  StarIcon,
} from '@heroicons/react/24/outline'
import type { ReactNode } from 'react'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const hoverStatusSchema = z.enum([
  'uploaded',
  'in_progress',
  'ready_for_download',
])

type HoverStatus = z.infer<typeof hoverStatusSchema>

const HOVER_STATUS_LABELS: Record<HoverStatus, string> = {
  uploaded: 'Uploaded',
  in_progress: 'Processing',
  ready_for_download: 'Ready for Download',
}

function getStatusHoverLabel(status: string): string {
  const parsed = hoverStatusSchema.safeParse(status.toLowerCase())
  if (parsed.success) return HOVER_STATUS_LABELS[parsed.data]
  return status
}

export function StatusIcon({ status }: { status: string }) {
  const normalized = status.toLowerCase()
  const label = getStatusHoverLabel(status)

  function withTooltip(icon: ReactNode) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center justify-center" aria-label={label}>
            {icon}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">{label}</TooltipContent>
      </Tooltip>
    )
  }

  if (normalized === 'uploaded') {
    return withTooltip(<ArrowUpTrayIcon className="size-4 text-chart-3" />)
  }
  if (normalized === 'in_progress') {
    return withTooltip(<ArrowPathIcon className="size-4 animate-spin text-chart-1" />)
  }
  if (normalized === 'complete' || normalized === 'completed') {
    return <StarIcon className="size-4 text-chart-3" aria-label="complete" />
  }
  if (normalized === 'ready_for_download') {
    return withTooltip(<CheckCircleIcon className="size-4 text-chart-2" />)
  }
  return <span className="text-xs">{status}</span>
}

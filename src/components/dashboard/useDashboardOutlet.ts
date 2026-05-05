import type { User } from '@supabase/supabase-js'
import { useOutletContext } from 'react-router-dom'

export type DashboardOutletContext = {
  user: User
  isAdmin: boolean
  adminLoading: boolean
}

export function useDashboardOutlet() {
  return useOutletContext<DashboardOutletContext>()
}

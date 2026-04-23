import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { Navigate, Route, Routes } from 'react-router-dom'

import { AuthGate } from '@/components/AuthGate'
import {
  Dashboard,
  DashboardAllJobsRoute,
  DashboardAuditLogsRoute,
  DashboardCreateRoute,
  DashboardHelpRoute,
  DashboardJobsRoute,
  DashboardUploadErrataRoute,
} from '@/components/Dashboard'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { getSupabase } from '@/lib/supabase'

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const supabase = getSupabase()
    void supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setReady(true)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (!ready) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }

  return (
    <TooltipProvider>
      <Routes>
        <Route
          path="/"
          element={
            user ? <Navigate to="/dashboard" replace /> : <AuthGate />
          }
        />
        <Route
          path="/dashboard"
          element={
            user ? <Dashboard user={user} /> : <Navigate to="/" replace />
          }
        >
          <Route index element={<DashboardJobsRoute />} />
          <Route path="create" element={<DashboardCreateRoute />} />
          <Route path="all-jobs" element={<DashboardAllJobsRoute />} />
          <Route path="audit-logs" element={<DashboardAuditLogsRoute />} />
          <Route path="upload-errata" element={<DashboardUploadErrataRoute />} />
          <Route path="help" element={<DashboardHelpRoute />} />
        </Route>
        <Route
          path="*"
          element={<Navigate to={user ? '/dashboard' : '/'} replace />}
        />
      </Routes>
      <Toaster />
    </TooltipProvider>
  )
}

export default App

import { useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import {
  NavLink,
  Outlet,
  useLocation,
  useMatch,
} from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import type { DashboardOutletContext } from '@/components/dashboard/useDashboardOutlet'
import { fetchCurrentUserIsAdmin } from '@/lib/admin'
import { logAuditEventFromClient } from '@/lib/auditLogs'
import { getSupabase } from '@/lib/supabase'

function dashboardPageTitle(pathname: string): string {
  if (pathname.endsWith('/create')) return 'Create a job'
  if (pathname.endsWith('/all-jobs')) return 'All jobs'
  if (pathname.endsWith('/audit-logs')) return 'Audit logs'
  if (pathname.endsWith('/upload-errata')) return 'Upload errata PDF'
  if (pathname.endsWith('/help')) return 'Request help'
  return 'Your jobs'
}

export function Dashboard({ user }: { user: User }) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminLoading, setAdminLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setAdminLoading(true)
      setIsAdmin(false)
      const v = await fetchCurrentUserIsAdmin()
      if (!cancelled) {
        setIsAdmin(v)
        setAdminLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user.id])

  const outletContext = useMemo<DashboardOutletContext>(
    () => ({ user, isAdmin, adminLoading }),
    [user, isAdmin, adminLoading],
  )

  const location = useLocation()
  const matchJobs = useMatch({ path: '/dashboard', end: true })
  const matchCreate = useMatch('/dashboard/create')
  const matchAllJobs = useMatch('/dashboard/all-jobs')
  const matchAuditLogs = useMatch('/dashboard/audit-logs')
  const matchUploadErrata = useMatch('/dashboard/upload-errata')
  const matchHelp = useMatch('/dashboard/help')

  async function handleSignOut() {
    const supabase = getSupabase()
    await logAuditEventFromClient({
      action: 'auth.sign_out',
      table_name: 'auth.users',
      record_id: null,
      ip_address: null,
    })
    await supabase.auth.signOut()
    toast.success('Signed out')
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border px-2 py-3">
          <span className="truncate px-2 text-sm font-semibold">DepOwl</span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={!!matchJobs}>
                    <NavLink to="/dashboard" end>
                      Jobs
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={!!matchCreate}>
                    <NavLink to="/dashboard/create">Create a Job</NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {isAdmin ? (
                  <>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={!!matchAllJobs}>
                        <NavLink to="/dashboard/all-jobs">All Jobs</NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={!!matchAuditLogs}>
                        <NavLink to="/dashboard/audit-logs">Audit logs</NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={!!matchUploadErrata}
                      >
                        <NavLink to="/dashboard/upload-errata">
                          Upload Errata PDF
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </>
                ) : null}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={!!matchHelp}>
                    <NavLink to="/dashboard/help">Help</NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border p-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => void handleSignOut()}
          >
            Sign out
          </Button>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <h2 className="text-sm font-medium">
            {dashboardPageTitle(location.pathname)}
          </h2>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4">
          <Outlet context={outletContext} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

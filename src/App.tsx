import { PrivateRoute } from '@/components/private-route'
import { RoleRoute } from '@/components/role-route'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/contexts/auth-context'
import LoginPage from '@/pages/auth/login'
import RegisterPage from '@/pages/auth/register'
import EmployeeDashboard from '@/pages/employee/dashboard'
import HirerDashboard from '@/pages/hirer/dashboard'
import EmployeesPage from '@/pages/hirer/employees'
import ChatPage from '@/pages/shared/chat'
import HomePage from '@/pages/shared/home'
import JobDetailPage from '@/pages/shared/job-detail'
import JobEditPage from '@/pages/shared/job-edit'
import JobNewPage from '@/pages/shared/job-new'
import JobsPage from '@/pages/shared/jobs'
import OffDayNewPage from '@/pages/shared/off-day-new'
import OffDaysPage from '@/pages/shared/off-days'
import ProfilePage from '@/pages/shared/profile'
import ReportNewPage from '@/pages/shared/report-new'
import ReportsPage from '@/pages/shared/reports'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './pages/layout'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Short stale window so data refreshes on navigation/focus without
      // stampeding the server. Individual queries can override when they need
      // to stay fresh (realtime-backed queries) or cache longer.
      staleTime: 10_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      refetchOnMount: 'always',
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <TooltipProvider delay={200}>
          <Routes>
            <Route element={<AppLayout />}>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Private routes */}
              <Route element={<PrivateRoute />}>
                <Route path="/" element={<HomePage />} />

                {/* Shared routes (both roles) */}
                <Route path="/jobs" element={<JobsPage />} />
                <Route path="/jobs/:id" element={<JobDetailPage />} />
                <Route path="/chat/:transferId" element={<ChatPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/off-days" element={<OffDaysPage />} />
                <Route path="/profile" element={<ProfilePage />} />

                {/* Hirer routes */}
                <Route element={<RoleRoute allowedRole="hirer" />}>
                  <Route path="/hirer" element={<HirerDashboard />} />
                  <Route path="/employees" element={<EmployeesPage />} />
                  <Route path="/jobs/new" element={<JobNewPage />} />
                  <Route path="/jobs/:id/edit" element={<JobEditPage />} />
                </Route>

                {/* Employee routes */}
                <Route element={<RoleRoute allowedRole="employee" />}>
                  <Route path="/employee" element={<EmployeeDashboard />} />
                  <Route path="/reports/new" element={<ReportNewPage />} />
                  <Route path="/off-days/new" element={<OffDayNewPage />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
          <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App

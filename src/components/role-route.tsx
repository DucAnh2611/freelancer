import { useAuth } from '@/hooks/use-auth'
import type { UserRole } from '@/types/database'
import { Navigate, Outlet } from 'react-router-dom'

interface RoleRouteProps {
  allowedRole: UserRole
}

export function RoleRoute({ allowedRole }: RoleRouteProps) {
  const { profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!profile || profile.role !== allowedRole) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

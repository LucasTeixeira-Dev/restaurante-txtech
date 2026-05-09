import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import type { PapelUsuario } from '@/types'

interface PrivateRouteProps {
  papeis?: PapelUsuario[]
  children?: React.ReactNode
}

export default function PrivateRoute({ papeis, children }: PrivateRouteProps) {
  const { isAuthenticated, can } = useAuthStore()

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  if (papeis && papeis.length > 0 && !can(papeis)) {
    return <Navigate to="/dashboard" replace />
  }

  return children ? <>{children}</> : <Outlet />
}

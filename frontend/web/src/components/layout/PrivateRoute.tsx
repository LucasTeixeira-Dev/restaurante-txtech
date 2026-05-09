import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import type { PapelUsuario } from '@/types'

interface PrivateRouteProps {
  papeis?: PapelUsuario[]
}

export default function PrivateRoute({ papeis }: PrivateRouteProps) {
  const { isAuthenticated, can } = useAuthStore()

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  if (papeis && papeis.length > 0 && !can(papeis)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

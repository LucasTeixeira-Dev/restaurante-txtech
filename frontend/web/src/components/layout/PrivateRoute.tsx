import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import type { PapelUsuario } from '@/types'

interface PrivateRouteProps {
  papeis?: PapelUsuario[]
  children?: React.ReactNode
}

export default function PrivateRoute({ papeis, children }: PrivateRouteProps) {
  const { isAuthenticated, can, usuario } = useAuthStore()

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />
  }

  // Tablet de mesa só usa a tela de autoatendimento; equipe não usa a do tablet.
  const ehMesa = usuario?.papel === 'mesa'
  const rotaDeMesa = !!papeis?.includes('mesa')
  if (ehMesa && !rotaDeMesa) {
    return <Navigate to="/mesa" replace />
  }
  if (!ehMesa && rotaDeMesa) {
    return <Navigate to="/dashboard" replace />
  }

  if (papeis && papeis.length > 0 && !can(papeis)) {
    return <Navigate to="/dashboard" replace />
  }

  return children ? <>{children}</> : <Outlet />
}

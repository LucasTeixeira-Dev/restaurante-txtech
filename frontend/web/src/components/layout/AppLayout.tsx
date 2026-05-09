import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  ChefHat,
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  Table2,
  Users,
  Package,
  BarChart3,
  CreditCard,
  LogOut,
} from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/stores/authStore'
import { authService } from '@/services/authService'
import { cn } from '@/utils/cn'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, papeis: ['gerente', 'garcom', 'chapeiro', 'caixa'] },
  { to: '/pedidos', label: 'Pedidos', icon: ShoppingBag, papeis: ['gerente', 'garcom', 'chapeiro'] },
  { to: '/mesas', label: 'Mesas', icon: Table2, papeis: ['gerente', 'garcom'] },
  { to: '/produtos', label: 'Produtos', icon: UtensilsCrossed, papeis: ['gerente'] },
  { to: '/usuarios', label: 'Usuários', icon: Users, papeis: ['gerente'] },
  { to: '/estoque', label: 'Estoque', icon: Package, papeis: ['gerente'] },
  { to: '/caixa', label: 'Caixa', icon: CreditCard, papeis: ['gerente', 'caixa'] },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3, papeis: ['gerente'] },
]

export default function AppLayout() {
  const navigate = useNavigate()
  const { usuario, logout, can } = useAuthStore()

  const { mutate: handleLogout } = useMutation({
    mutationFn: authService.logout,
    onSettled: () => {
      logout()
      navigate('/login')
      toast.success('Logout realizado.')
    },
  })

  const visibleItems = navItems.filter((item) =>
    can(item.papeis as any),
  )

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
          <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-sm">TxTech</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {visibleItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                )
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-gray-100">
          <div className="px-3 py-2 mb-2">
            <p className="text-xs font-semibold text-gray-900 truncate">{usuario?.nome}</p>
            <p className="text-xs text-gray-400 capitalize">{usuario?.papel}</p>
          </div>
          <button
            onClick={() => handleLogout()}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}

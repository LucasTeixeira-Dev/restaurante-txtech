import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'react-hot-toast'
import LoginPage from '@/pages/auth/LoginPage'
import AppLayout from '@/components/layout/AppLayout'
import PrivateRoute from '@/components/layout/PrivateRoute'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import MesasPage from '@/pages/mesas/MesasPage'
import PedidosPage from '@/pages/pedidos/PedidosPage'
import NovoPedidoPage from '@/pages/pedidos/NovoPedidoPage'
import DetalhesPedidoPage from '@/pages/pedidos/DetalhesPedidoPage'
import KdsPage from '@/pages/kds/KdsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* KDS — tela full screen para chapeiro, sem o AppLayout sidebar */}
          <Route element={<PrivateRoute papeis={['gerente', 'chapeiro']} />}>
            <Route path="/kds" element={<KdsPage />} />
          </Route>

          <Route element={<PrivateRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />

              {/* Mesas */}
              <Route path="/mesas" element={<MesasPage />} />

              {/* Pedidos */}
              <Route path="/pedidos" element={<PedidosPage />} />
              <Route
                path="/pedidos/novo"
                element={
                  <PrivateRoute papeis={['gerente', 'garcom']}>
                    <NovoPedidoPage />
                  </PrivateRoute>
                }
              />
              <Route path="/pedidos/:id" element={<DetalhesPedidoPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

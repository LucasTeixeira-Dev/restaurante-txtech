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
import ProdutosPage from '@/pages/produtos/ProdutosPage'
import CategoriasPage from '@/pages/produtos/CategoriasPage'
import CaixaPage from '@/pages/caixa/CaixaPage'
import RelatoriosPage from '@/pages/relatorios/RelatoriosPage'
import UsuariosPage from '@/pages/usuarios/UsuariosPage'
import EstoquePage from '@/pages/estoque/EstoquePage'

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
              <Route element={<PrivateRoute papeis={['gerente', 'garcom']} />}>
                <Route path="/mesas" element={<MesasPage />} />
              </Route>

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

              {/* Produtos e categorias — gerente */}
              <Route element={<PrivateRoute papeis={['gerente']} />}>
                <Route path="/produtos" element={<ProdutosPage />} />
                <Route path="/categorias" element={<CategoriasPage />} />
              </Route>

              {/* Usuários — gerente */}
              <Route element={<PrivateRoute papeis={['gerente']} />}>
                <Route path="/usuarios" element={<UsuariosPage />} />
              </Route>

              {/* Estoque — gerente */}
              <Route element={<PrivateRoute papeis={['gerente']} />}>
                <Route path="/estoque" element={<EstoquePage />} />
              </Route>

              {/* Caixa — gerente e caixa */}
              <Route element={<PrivateRoute papeis={['gerente', 'caixa']} />}>
                <Route path="/caixa" element={<CaixaPage />} />
              </Route>

              {/* Relatórios — gerente */}
              <Route element={<PrivateRoute papeis={['gerente']} />}>
                <Route path="/relatorios" element={<RelatoriosPage />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

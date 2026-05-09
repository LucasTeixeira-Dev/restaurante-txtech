import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { solicitarPermissaoNotificacao } from '@/hooks/useNotificacoes'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
})

function NotificacaoSetup() {
  useEffect(() => {
    solicitarPermissaoNotificacao()
  }, [])
  return null
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <NotificacaoSetup />
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  )
}

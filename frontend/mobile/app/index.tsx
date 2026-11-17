import { Redirect } from 'expo-router'
import { useAuthStore } from '@/stores/authStore'
import LoadingView from '@/components/LoadingView'

export default function Index() {
  const hidratado = useAuthStore((s) => s.hidratado)
  const isAuthenticated = useAuthStore((s) => !!s.token && !!s.usuario)

  // Sem esperar o SecureStore, o app sempre abriria no login mesmo com sessão salva.
  if (!hidratado) return <LoadingView />

  return isAuthenticated
    ? <Redirect href="/(app)/dashboard" />
    : <Redirect href="/(auth)/login" />
}

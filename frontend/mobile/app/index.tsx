import { Redirect } from 'expo-router'
import { useAuthStore } from '@/stores/authStore'

export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())

  return isAuthenticated
    ? <Redirect href="/(app)/dashboard" />
    : <Redirect href="/(auth)/login" />
}

import { View, Text, StyleSheet } from 'react-native'
import { useAuthStore } from '@/stores/authStore'

export default function DashboardScreen() {
  const usuario = useAuthStore((s) => s.usuario)

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Olá, {usuario?.nome}!</Text>
      <Text style={styles.subtitle}>Bem-vindo ao Restaurante TxTech.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    marginTop: 8,
  },
})

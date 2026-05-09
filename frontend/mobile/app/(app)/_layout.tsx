import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '@/stores/authStore'
import { usePedidosPolling } from '@/hooks/usePedidosPolling'

export default function AppLayout() {
  const can = useAuthStore((s) => s.can)
  usePedidosPolling()

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#f97316',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#f3f4f6' },
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontWeight: '700', color: '#111827' },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />

      <Tabs.Screen
        name="pedidos/index"
        options={{
          title: 'Pedidos',
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" size={size} color={color} />,
        }}
      />

      {/* Scanner / Novo Pedido — garcom e gerente */}
      <Tabs.Screen
        name="scanner"
        options={{
          title: 'Escanear',
          href: can(['gerente', 'garcom']) ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="qr-code-outline" size={size} color={color} />,
        }}
      />

      {/* KDS — chapeiro e gerente */}
      <Tabs.Screen
        name="kds"
        options={{
          title: 'KDS',
          href: can(['gerente', 'chapeiro']) ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="restaurant-outline" size={size} color={color} />,
        }}
      />

      {/* Telas sem tab */}
      <Tabs.Screen name="pedidos/[id]" options={{ href: null, title: 'Pedido' }} />
      <Tabs.Screen name="novo-pedido" options={{ href: null, title: 'Novo Pedido' }} />
    </Tabs>
  )
}

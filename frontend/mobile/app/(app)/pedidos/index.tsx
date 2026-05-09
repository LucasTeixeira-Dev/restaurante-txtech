import { useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet,
} from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { pedidoService } from '@/services/pedidoService'
import { useAuthStore } from '@/stores/authStore'
import LoadingView from '@/components/LoadingView'
import StatusBadge from '@/components/StatusBadge'
import EmptyView from '@/components/EmptyView'
import type { StatusPedido } from '@/types'

const ABAS: { label: string; status?: StatusPedido }[] = [
  { label: 'Todos' },
  { label: 'Abertos', status: 'aberto' },
  { label: 'Em preparo', status: 'em_preparo' },
  { label: 'Prontos', status: 'pronto' },
]

export default function PedidosScreen() {
  const router = useRouter()
  const can = useAuthStore((s) => s.can)
  const [abaAtiva, setAbaAtiva] = useState<StatusPedido | undefined>(undefined)

  const { data: pedidos = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['pedidos-mobile', abaAtiva],
    queryFn: () => pedidoService.listar(abaAtiva ? { status: abaAtiva } : {}),
    refetchInterval: 30_000,
  })

  if (isLoading) return <LoadingView />

  return (
    <View style={styles.container}>
      {/* Filtros */}
      <View style={styles.abas}>
        {ABAS.map((a) => (
          <TouchableOpacity
            key={a.label}
            style={[styles.aba, abaAtiva === a.status && styles.abaAtiva]}
            onPress={() => setAbaAtiva(a.status)}
          >
            <Text style={[styles.abaText, abaAtiva === a.status && styles.abaTextAtivo]}>
              {a.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={pedidos}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f97316" />}
        ListEmptyComponent={<EmptyView mensagem="Nenhum pedido encontrado." />}
        renderItem={({ item: p }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/(app)/pedidos/${p.id}`)}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.pedidoNum}>Pedido #{p.id}</Text>
                {p.mesa && <Text style={styles.mesa}>Mesa {p.mesa.numero}</Text>}
              </View>
              <StatusBadge status={p.status} />
            </View>
            <View style={styles.cardFooter}>
              <Text style={styles.total}>R$ {p.total.toFixed(2)}</Text>
              <Text style={styles.tempo}>
                {formatDistanceToNow(parseISO(p.criado_em), { locale: ptBR, addSuffix: true })}
              </Text>
            </View>
            {p.itens?.length > 0 && (
              <Text style={styles.itens}>
                {p.itens.length} item{p.itens.length !== 1 ? 's' : ''}
              </Text>
            )}
          </TouchableOpacity>
        )}
      />

      {can(['gerente', 'garcom']) && (
        <TouchableOpacity style={styles.fab} onPress={() => router.push('/(app)/scanner')}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  abas: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderColor: '#f3f4f6', paddingHorizontal: 4,
  },
  aba: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  abaAtiva: { borderBottomWidth: 2, borderBottomColor: '#f97316' },
  abaText: { fontSize: 12, fontWeight: '600', color: '#9ca3af' },
  abaTextAtivo: { color: '#f97316' },
  card: {
    backgroundColor: '#fff', borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: '#f3f4f6', gap: 10,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  pedidoNum: { fontSize: 15, fontWeight: '700', color: '#111827' },
  mesa: { fontSize: 13, color: '#9ca3af', marginTop: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  total: { fontSize: 16, fontWeight: '700', color: '#111827' },
  tempo: { fontSize: 12, color: '#9ca3af' },
  itens: { fontSize: 12, color: '#6b7280' },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#f97316', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#f97316', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
})

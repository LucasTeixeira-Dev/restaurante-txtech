import {
  View, Text, ScrollView, TouchableOpacity, Alert,
  RefreshControl, ActivityIndicator, StyleSheet,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { pedidoService } from '@/services/pedidoService'
import { useAuthStore } from '@/stores/authStore'
import LoadingView from '@/components/LoadingView'
import StatusBadge from '@/components/StatusBadge'
import type { StatusItemPedido } from '@/types'

const PROXIMO_STATUS: Record<string, string> = {
  aberto: 'em_preparo',
  em_preparo: 'pronto',
  pronto: 'entregue',
}

const PROXIMO_ITEM_STATUS: Record<string, StatusItemPedido> = {
  pendente: 'em_preparo',
  em_preparo: 'pronto',
}

export default function DetalhesPedidoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const can = useAuthStore((s) => s.can)

  const { data: pedido, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['pedido-mobile', id],
    queryFn: () => pedidoService.buscar(Number(id)),
    refetchInterval: 15_000,
  })

  const { mutate: avancarStatus, isPending: avancando } = useMutation({
    mutationFn: (status: string) =>
      pedidoService.atualizarStatus(Number(id), status as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedido-mobile', id] })
      queryClient.invalidateQueries({ queryKey: ['pedidos-mobile'] })
    },
    onError: (e: any) => Alert.alert('Erro', e?.response?.data?.message ?? 'Erro ao atualizar status.'),
  })

  const { mutate: avancarItem } = useMutation({
    mutationFn: ({ itemId, status }: { itemId: number; status: StatusItemPedido }) =>
      pedidoService.atualizarStatusItem(Number(id), itemId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pedido-mobile', id] }),
  })

  const { mutate: cancelar, isPending: cancelando } = useMutation({
    mutationFn: () => pedidoService.atualizarStatus(Number(id), 'cancelado'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos-mobile'] })
      router.back()
    },
    onError: (e: any) => Alert.alert('Erro', e?.response?.data?.message ?? 'Erro ao cancelar.'),
  })

  if (isLoading) return <LoadingView />
  if (!pedido) return null

  const proximoStatus = PROXIMO_STATUS[pedido.status]
  const podeCancelar = pedido.status === 'aberto' && can(['gerente', 'garcom'])

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f97316" />}
    >
      {/* Cabeçalho */}
      <View style={styles.header}>
        <View>
          <Text style={styles.titulo}>Pedido #{pedido.id}</Text>
          <Text style={styles.subtitulo}>
            {format(parseISO(pedido.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </Text>
        </View>
        <StatusBadge status={pedido.status} />
      </View>

      {/* Info */}
      <View style={styles.infoRow}>
        {pedido.mesa && (
          <View style={styles.infoItem}>
            <Ionicons name="grid-outline" size={16} color="#9ca3af" />
            <Text style={styles.infoText}>Mesa {pedido.mesa.numero}</Text>
          </View>
        )}
        {pedido.usuario && (
          <View style={styles.infoItem}>
            <Ionicons name="person-outline" size={16} color="#9ca3af" />
            <Text style={styles.infoText}>{pedido.usuario.nome}</Text>
          </View>
        )}
      </View>

      {/* Itens */}
      <Text style={styles.sectionTitle}>Itens do pedido</Text>
      <View style={styles.itensCard}>
        {pedido.itens.map((item, idx) => {
          const proximoItemStatus = PROXIMO_ITEM_STATUS[item.status]
          const podeAvancarItem = proximoItemStatus && can(['gerente', 'chapeiro'])
          return (
            <View key={item.id} style={[styles.item, idx > 0 && styles.itemBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemNome}>{item.produto?.nome ?? `Produto #${item.produto_id}`}</Text>
                <Text style={styles.itemInfo}>
                  {item.quantidade}× — R$ {item.subtotal.toFixed(2)}
                </Text>
                {item.observacoes ? (
                  <Text style={styles.itemObs}>{item.observacoes}</Text>
                ) : null}
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <StatusBadge status={item.status} />
                {podeAvancarItem && (
                  <TouchableOpacity
                    style={styles.itemBtn}
                    onPress={() => avancarItem({ itemId: item.id, status: proximoItemStatus })}
                  >
                    <Ionicons name="arrow-forward-outline" size={14} color="#f97316" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )
        })}

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>R$ {pedido.total.toFixed(2)}</Text>
        </View>
      </View>

      {/* Ações */}
      {proximoStatus && can(['gerente', 'garcom', 'chapeiro']) && (
        <TouchableOpacity
          style={[styles.avancarBtn, avancando && { opacity: 0.6 }]}
          onPress={() => avancarStatus(proximoStatus)}
          disabled={avancando}
        >
          {avancando
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.avancarText}>
                Avançar para "{proximoStatus.replace('_', ' ')}"
              </Text>
          }
        </TouchableOpacity>
      )}

      {podeCancelar && (
        <TouchableOpacity
          style={[styles.cancelarBtn, cancelando && { opacity: 0.6 }]}
          onPress={() =>
            Alert.alert('Cancelar pedido?', 'Esta ação não pode ser desfeita.', [
              { text: 'Não' },
              { text: 'Cancelar pedido', style: 'destructive', onPress: () => cancelar() },
            ])
          }
          disabled={cancelando}
        >
          <Text style={styles.cancelarText}>Cancelar pedido</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  titulo: { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitulo: { fontSize: 13, color: '#9ca3af', marginTop: 3 },
  infoRow: { flexDirection: 'row', gap: 16 },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  infoText: { fontSize: 14, color: '#6b7280' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  itensCard: {
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: '#f3f4f6', overflow: 'hidden',
  },
  item: { padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  itemBorder: { borderTopWidth: 1, borderTopColor: '#f9fafb' },
  itemNome: { fontSize: 14, fontWeight: '600', color: '#111827' },
  itemInfo: { fontSize: 13, color: '#9ca3af', marginTop: 2 },
  itemObs: { fontSize: 12, color: '#f97316', fontStyle: 'italic', marginTop: 2 },
  itemBtn: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: '#ffedd5',
    justifyContent: 'center', alignItems: 'center',
  },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6',
  },
  totalLabel: { fontSize: 15, fontWeight: '600', color: '#374151' },
  totalValue: { fontSize: 18, fontWeight: '700', color: '#111827' },
  avancarBtn: {
    backgroundColor: '#f97316', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  avancarText: { color: '#fff', fontSize: 15, fontWeight: '700', textTransform: 'capitalize' },
  cancelarBtn: {
    backgroundColor: '#fff', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#fecaca',
  },
  cancelarText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
})

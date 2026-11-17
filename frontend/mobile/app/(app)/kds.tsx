import {
  View, Text, FlatList, TouchableOpacity,
  RefreshControl, StyleSheet, Alert,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { pedidoService } from '@/services/pedidoService'
import { useAuthStore } from '@/stores/authStore'
import LoadingView from '@/components/LoadingView'
import EmptyView from '@/components/EmptyView'
import type { Pedido, StatusItemPedido } from '@/types'

const ITEM_PROX: Record<string, StatusItemPedido> = {
  pendente: 'em_preparo',
  em_preparo: 'pronto',
}

const ITEM_COR: Record<string, string> = {
  pendente: '#fef9c3',
  em_preparo: '#ffedd5',
  pronto: '#dcfce7',
}

const ITEM_COR_TEXT: Record<string, string> = {
  pendente: '#a16207',
  em_preparo: '#c2410c',
  pronto: '#15803d',
}

export default function KdsScreen() {
  const queryClient = useQueryClient()
  const papel = useAuthStore((s) => s.usuario?.papel)
  const setor = papel === 'bar' ? 'bar' : papel === 'chapeiro' ? 'cozinha' : null // null = todos
  const doSetor = (s: string) => !setor || s === setor

  const { data: pedidos = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['kds-mobile'],
    queryFn: () => pedidoService.listar({ status: 'em_preparo' }),
    refetchInterval: 10_000,
  })

  const { data: abertos = [] } = useQuery({
    queryKey: ['kds-mobile-abertos'],
    queryFn: () => pedidoService.listar({ status: 'aberto' }),
    refetchInterval: 10_000,
  })

  const todosPedidos = [...abertos, ...pedidos]
    .filter((p) => p.itens.some((i) => doSetor(i.setor) && (i.status === 'pendente' || i.status === 'em_preparo')))
    .sort(
    (a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime(),
  )

  const { mutate: avancarItem } = useMutation({
    mutationFn: ({ pedidoId, itemId, status }: { pedidoId: number; itemId: number; status: StatusItemPedido }) =>
      pedidoService.atualizarStatusItem(pedidoId, itemId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kds-mobile'] })
      queryClient.invalidateQueries({ queryKey: ['kds-mobile-abertos'] })
    },
    onError: (e: any) => Alert.alert('Erro', e?.response?.data?.message ?? 'Não foi possível atualizar o item.'),
  })

  const { mutate: marcarPronto } = useMutation({
    mutationFn: (pedidoId: number) => pedidoService.atualizarStatus(pedidoId, 'pronto'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kds-mobile'] })
      queryClient.invalidateQueries({ queryKey: ['kds-mobile-abertos'] })
    },
  })

  if (isLoading) return <LoadingView />

  const minutos = (criado_em: string) => {
    const diff = (Date.now() - new Date(criado_em).getTime()) / 60000
    return Math.floor(diff)
  }

  return (
    <View style={styles.container}>
      {/* Indicador live */}
      <View style={styles.liveBar}>
        <View style={styles.liveDot} />
        <Text style={styles.liveText}>Atualização automática a cada 10s</Text>
        <Text style={styles.liveCount}>{todosPedidos.length} pedido{todosPedidos.length !== 1 ? 's' : ''}</Text>
      </View>

      <FlatList
        data={todosPedidos}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={{ padding: 16, gap: 16, flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f97316" />
        }
        ListEmptyComponent={
          <EmptyView mensagem="Nenhum pedido em aberto ou em preparo no momento." />
        }
        renderItem={({ item: pedido }) => {
          const mins = minutos(pedido.criado_em)
          const urgente = mins >= 15
          const itensDoSetor = pedido.itens.filter((i) => i.status !== 'cancelado' && doSetor(i.setor))
          const faltaPreparar = itensDoSetor.some((i) => i.status !== 'pronto')

          return (
            <View style={[styles.card, urgente && styles.cardUrgente]}>
              {/* Cabeçalho do card */}
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.pedidoNum}>#{pedido.id}</Text>
                  {pedido.mesa && (
                    <View style={styles.mesaBadge}>
                      <Text style={styles.mesaText}>Mesa {pedido.mesa.numero}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.cardHeaderRight}>
                  <View style={[styles.tempoBadge, urgente && styles.tempoBadgeUrgente]}>
                    <Ionicons
                      name="time-outline"
                      size={13}
                      color={urgente ? '#dc2626' : '#6b7280'}
                    />
                    <Text style={[styles.tempoText, urgente && styles.tempoTextUrgente]}>
                      {mins}min
                    </Text>
                  </View>
                </View>
              </View>

              {/* Itens */}
              <View style={styles.itens}>
                {itensDoSetor.map((item) => {
                  const prox = ITEM_PROX[item.status]
                  return (
                    <View
                      key={item.id}
                      style={[styles.item, { backgroundColor: ITEM_COR[item.status] ?? '#f9fafb' }]}
                    >
                      <View style={styles.itemLeft}>
                        <Text style={[styles.itemStatus, { color: ITEM_COR_TEXT[item.status] ?? '#374151' }]}>
                          ●
                        </Text>
                        <View>
                          <Text style={styles.itemNome}>
                            {item.quantidade}× {item.produto?.nome ?? `#${item.produto_id}`}
                          </Text>
                          {item.observacoes ? (
                            <Text style={styles.itemObs}>{item.observacoes}</Text>
                          ) : null}
                        </View>
                      </View>
                      {prox && (
                        <TouchableOpacity
                          style={styles.itemBtn}
                          onPress={() => avancarItem({ pedidoId: pedido.id, itemId: item.id, status: prox })}
                        >
                          <Text style={styles.itemBtnText}>
                            {prox === 'em_preparo' ? 'Iniciar' : 'Pronto'}
                          </Text>
                        </TouchableOpacity>
                      )}
                      {item.status === 'pronto' && (
                        <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
                      )}
                    </View>
                  )
                })}
              </View>

              {/* Marcar pedido como pronto */}
              {/* A API só marca como prontos os itens do setor de quem toca. */}
              {faltaPreparar && pedido.status === 'em_preparo' && (
                <TouchableOpacity
                  style={styles.prontoBtn}
                  onPress={() => marcarPronto(pedido.id)}
                >
                  <Ionicons name="checkmark-done-outline" size={18} color="#fff" />
                  <Text style={styles.prontoBtnText}>Marcar tudo como pronto</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  liveBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1f2937', paddingHorizontal: 16, paddingVertical: 10,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  liveText: { flex: 1, fontSize: 12, color: '#9ca3af' },
  liveCount: { fontSize: 12, fontWeight: '700', color: '#f9fafb' },
  card: {
    backgroundColor: '#1f2937', borderRadius: 16,
    overflow: 'hidden', borderWidth: 1, borderColor: '#374151',
  },
  cardUrgente: { borderColor: '#dc2626' },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 14, borderBottomWidth: 1, borderBottomColor: '#374151',
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardHeaderRight: {},
  pedidoNum: { fontSize: 18, fontWeight: '700', color: '#f9fafb' },
  mesaBadge: { backgroundColor: '#374151', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99 },
  mesaText: { fontSize: 12, color: '#d1d5db', fontWeight: '600' },
  tempoBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#374151', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99,
  },
  tempoBadgeUrgente: { backgroundColor: '#450a0a' },
  tempoText: { fontSize: 12, fontWeight: '700', color: '#9ca3af' },
  tempoTextUrgente: { color: '#dc2626' },
  itens: { padding: 12, gap: 8 },
  item: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 10, padding: 10, gap: 8,
  },
  itemLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, flex: 1 },
  itemStatus: { fontSize: 16, lineHeight: 20 },
  itemNome: { fontSize: 14, fontWeight: '600', color: '#111827' },
  itemObs: { fontSize: 12, color: '#f97316', fontStyle: 'italic', marginTop: 1 },
  itemBtn: {
    backgroundColor: '#f97316', paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 8,
  },
  itemBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  prontoBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#16a34a', margin: 12, borderRadius: 12, padding: 12,
  },
  prontoBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
})

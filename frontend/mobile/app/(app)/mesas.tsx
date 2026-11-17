import {
  View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet, Alert,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { mesaService } from '@/services/mesaService'
import { useCarrinhoStore } from '@/stores/carrinhoStore'
import { useAuthStore } from '@/stores/authStore'
import LoadingView from '@/components/LoadingView'
import EmptyView from '@/components/EmptyView'
import type { Mesa } from '@/types'

const STATUS_CONFIG: Record<Mesa['status'], { label: string; bg: string; border: string; text: string }> = {
  livre: { label: 'Livre', bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a' },
  ocupada: { label: 'Ocupada', bg: '#fef2f2', border: '#fecaca', text: '#dc2626' },
  reservada: { label: 'Reservada', bg: '#fffbeb', border: '#fde68a', text: '#d97706' },
}

export default function MesasScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const can = useAuthStore((s) => s.can)
  const definirMesa = useCarrinhoStore((s) => s.definirMesa)

  const { data: mesas = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['mesas-mobile'],
    queryFn: () => mesaService.listar(),
    refetchInterval: 30_000,
  })

  const { mutate: atualizarStatus } = useMutation({
    mutationFn: ({ id, status }: { id: number; status: Mesa['status'] }) =>
      mesaService.atualizarStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mesas-mobile'] }),
    onError: (e: any) => Alert.alert('Erro', e?.response?.data?.message ?? 'Erro ao atualizar a mesa.'),
  })

  const { mutate: atenderChamado } = useMutation({
    mutationFn: (id: number) => mesaService.atenderChamado(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mesas-mobile'] }),
  })

  const { mutate: confirmarMaquininha } = useMutation({
    mutationFn: ({ id, forma }: { id: number; forma: 'debito' | 'credito' }) => mesaService.confirmarMaquininha(id, forma),
    onSuccess: (conta) => {
      queryClient.invalidateQueries({ queryKey: ['mesas-mobile'] })
      Alert.alert('Pagamento', conta.status === 'paga' ? 'Confirmado. Conta quitada e mesa liberada.' : 'Pagamento confirmado.')
    },
    onError: (e: any) => Alert.alert('Erro', e?.response?.data?.message ?? 'Erro ao confirmar o pagamento.'),
  })

  const perguntarForma = (id: number, valor: number) =>
    Alert.alert('Maquininha', `Valor: R$ ${valor.toFixed(2)}. Como o cliente pagou?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Débito', onPress: () => confirmarMaquininha({ id, forma: 'debito' }) },
      { text: 'Crédito', onPress: () => confirmarMaquininha({ id, forma: 'credito' }) },
    ])

  const { mutate: pedirConta } = useMutation({
    mutationFn: (contaId: number) => mesaService.pedirConta(contaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mesas-mobile'] })
      Alert.alert('Conta', 'Caixa avisado: a mesa pediu a conta.')
    },
    onError: (e: any) => Alert.alert('Erro', e?.response?.data?.message ?? 'Erro ao pedir a conta.'),
  })

  const stats = {
    total: mesas.length,
    livres: mesas.filter((m) => m.status === 'livre').length,
    ocupadas: mesas.filter((m) => m.status === 'ocupada').length,
  }

  const handlePressMesa = (mesa: Mesa) => {
    if (mesa.pedido_ativo) {
      router.push(`/(app)/pedidos/${mesa.pedido_ativo.id}`)
    } else if (mesa.status !== 'reservada' && can(['gerente', 'garcom'])) {
      // Mesa livre ou com conta aberta: o pedido novo entra na mesma conta.
      definirMesa(mesa.id, mesa.numero)
      router.push('/(app)/novo-pedido')
    }
  }

  if (isLoading) return <LoadingView />

  return (
    <View style={styles.container}>
      {/* Resumo */}
      <View style={styles.resumo}>
        <ResumoCard label="Total" valor={stats.total} cor="#111827" />
        <ResumoCard label="Livres" valor={stats.livres} cor="#16a34a" />
        <ResumoCard label="Ocupadas" valor={stats.ocupadas} cor="#dc2626" />
      </View>

      <FlatList
        data={[...mesas].sort((a, b) => a.numero - b.numero)}
        keyExtractor={(m) => String(m.id)}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={{ gap: 12 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f97316" />}
        ListEmptyComponent={<EmptyView mensagem="Nenhuma mesa cadastrada." />}
        renderItem={({ item: mesa }) => {
          const cfg = STATUS_CONFIG[mesa.status]
          const clicavel =
            !!mesa.pedido_ativo || (mesa.status !== 'reservada' && can(['gerente', 'garcom']))

          return (
            <TouchableOpacity
              style={[styles.card, { backgroundColor: cfg.bg, borderColor: cfg.border }, !clicavel && styles.cardInativo]}
              onPress={() => clicavel && handlePressMesa(mesa)}
              activeOpacity={clicavel ? 0.7 : 1}
            >
              <Text style={styles.numero}>{mesa.numero}</Text>
              <View style={styles.capRow}>
                <Ionicons name="people-outline" size={12} color="#9ca3af" />
                <Text style={styles.cap}>{mesa.capacidade}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: cfg.border }]}>
                <Text style={[styles.badgeText, { color: cfg.text }]}>{cfg.label}</Text>
              </View>
              {mesa.conta && (
                <Text style={styles.total}>Conta R$ {mesa.conta.subtotal.toFixed(2)}</Text>
              )}
              {mesa.conta?.conta_solicitada && (
                <Text style={styles.alertaConta}>Em pagamento · falta R$ {mesa.conta.restante.toFixed(2)}</Text>
              )}
              {can(['gerente', 'garcom']) && mesa.conta?.pagamentos_pendentes
                .filter((p) => p.metodo === 'maquininha')
                .map((p) => (
                  <TouchableOpacity key={p.id} style={styles.maquininhaBtn} onPress={() => perguntarForma(p.id, p.valor)}>
                    <Ionicons name="card-outline" size={13} color="#fff" />
                    <Text style={styles.chamadoText}>Maquininha R$ {p.valor.toFixed(2)}</Text>
                  </TouchableOpacity>
                ))}
              {mesa.garcom_chamado_em && can(['gerente', 'garcom']) && (
                <TouchableOpacity style={styles.chamadoBtn} onPress={() => atenderChamado(mesa.id)}>
                  <Ionicons name="notifications" size={13} color="#fff" />
                  <Text style={styles.chamadoText}>Chamando · Atender</Text>
                </TouchableOpacity>
              )}
              {mesa.conta && !mesa.conta.conta_solicitada && can(['gerente', 'garcom']) && (
                <TouchableOpacity style={styles.contaBtn} onPress={() => pedirConta(mesa.conta!.id)}>
                  <Ionicons name="receipt-outline" size={13} color="#374151" />
                  <Text style={styles.contaBtnText}>Pedir conta</Text>
                </TouchableOpacity>
              )}

              {/* Ação rápida de status — apenas gerente/garçom */}
              {can(['gerente', 'garcom']) && mesa.status !== 'ocupada' && (
                <TouchableOpacity
                  style={styles.statusBtn}
                  onPress={() => {
                    const prox: Mesa['status'] = mesa.status === 'livre' ? 'reservada' : 'livre'
                    atualizarStatus({ id: mesa.id, status: prox })
                  }}
                >
                  <Ionicons name="swap-horizontal-outline" size={14} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          )
        }}
      />
    </View>
  )
}

function ResumoCard({ label, valor, cor }: { label: string; valor: number; cor: string }) {
  return (
    <View style={styles.resumoCard}>
      <Text style={[styles.resumoValor, { color: cor }]}>{valor}</Text>
      <Text style={styles.resumoLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  alertaConta: { fontSize: 11, fontWeight: '700', color: '#dc2626', textAlign: 'center' },
  maquininhaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#d97706',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5,
  },
  chamadoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ef4444',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5,
  },
  chamadoText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  contaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: '#e5e7eb',
  },
  contaBtnText: { fontSize: 11, fontWeight: '600', color: '#374151' },
  container: { flex: 1, backgroundColor: '#f9fafb' },
  resumo: {
    flexDirection: 'row', gap: 12, padding: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#f3f4f6',
  },
  resumoCard: {
    flex: 1, alignItems: 'center', backgroundColor: '#f9fafb',
    borderRadius: 12, paddingVertical: 12,
  },
  resumoValor: { fontSize: 24, fontWeight: '700' },
  resumoLabel: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  grid: { padding: 16, gap: 12 },
  card: {
    flex: 1, borderRadius: 16, padding: 16, borderWidth: 2,
    alignItems: 'center', gap: 6, position: 'relative',
  },
  cardInativo: { opacity: 0.7 },
  numero: { fontSize: 28, fontWeight: '700', color: '#111827' },
  capRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cap: { fontSize: 12, color: '#9ca3af' },
  badge: {
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99, marginTop: 2,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  total: { fontSize: 12, fontWeight: '600', color: '#374151', marginTop: 2 },
  statusBtn: {
    position: 'absolute', top: 8, right: 8,
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center',
  },
})

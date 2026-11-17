import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import LoadingView from '@/components/LoadingView'

interface DashboardData {
  kpis: {
    pedidos_hoje: number
    /** null para papéis sem acesso ao financeiro (garçom, chapeiro). */
    receita_hoje: number | null
    pedidos_ativos: number
    mesas_ocupadas: number
    mesas_total: number
    estoque_baixo: number
    caixa_aberto: boolean
  }
}

export default function DashboardScreen() {
  const router = useRouter()
  const { usuario, can } = useAuthStore()

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['dashboard-mobile'],
    queryFn: () => api.get<DashboardData>('/dashboard').then((r) => r.data),
    refetchInterval: 60_000,
  })

  if (isLoading) return <LoadingView />

  const kpis = data?.kpis
  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f97316" />}
    >
      {/* Saudação */}
      <View style={styles.header}>
        <View>
          <Text style={styles.saudacao}>{saudacao}, {usuario?.nome?.split(' ')[0]}!</Text>
          <Text style={styles.papel}>{usuario?.papel}</Text>
        </View>
        <View style={[styles.caixaBadge, { backgroundColor: kpis?.caixa_aberto ? '#dcfce7' : '#f3f4f6' }]}>
          <Ionicons
            name={kpis?.caixa_aberto ? 'lock-open-outline' : 'lock-closed-outline'}
            size={14}
            color={kpis?.caixa_aberto ? '#15803d' : '#6b7280'}
          />
          <Text style={[styles.caixaText, { color: kpis?.caixa_aberto ? '#15803d' : '#6b7280' }]}>
            Caixa {kpis?.caixa_aberto ? 'aberto' : 'fechado'}
          </Text>
        </View>
      </View>

      {/* KPI Cards */}
      <View style={styles.grid}>
        <KpiCard
          label="Pedidos hoje"
          value={String(kpis?.pedidos_hoje ?? 0)}
          icon="receipt-outline"
          color="#3b82f6"
          bg="#dbeafe"
        />
        {/* Receita só para gerente e caixa (a API também não envia aos demais). */}
        {can(['gerente', 'caixa']) && (
          <KpiCard
            label="Receita hoje"
            value={`R$ ${(kpis?.receita_hoje ?? 0).toFixed(2)}`}
            icon="cash-outline"
            color="#16a34a"
            bg="#dcfce7"
          />
        )}
        <KpiCard
          label="Pedidos ativos"
          value={String(kpis?.pedidos_ativos ?? 0)}
          icon="time-outline"
          color="#f97316"
          bg="#ffedd5"
          alert={(kpis?.pedidos_ativos ?? 0) > 5}
        />
        <KpiCard
          label="Mesas ocupadas"
          value={`${kpis?.mesas_ocupadas ?? 0} / ${kpis?.mesas_total ?? 0}`}
          icon="grid-outline"
          color="#8b5cf6"
          bg="#ede9fe"
        />
      </View>

      {/* Alerta estoque baixo */}
      {(kpis?.estoque_baixo ?? 0) > 0 && (
        <View style={styles.alerta}>
          <Ionicons name="warning-outline" size={18} color="#d97706" />
          <Text style={styles.alertaText}>
            <Text style={{ fontWeight: '700' }}>{kpis!.estoque_baixo} produto{kpis!.estoque_baixo > 1 ? 's' : ''}</Text>
            {' '}com estoque abaixo do mínimo.
          </Text>
        </View>
      )}

      {/* Ações rápidas */}
      <Text style={styles.sectionTitle}>Ações rápidas</Text>
      <View style={styles.acoes}>
        {can(['gerente', 'garcom']) && (
          <TouchableOpacity style={styles.acao} onPress={() => router.push('/(app)/scanner')}>
            <View style={[styles.acaoIcon, { backgroundColor: '#ffedd5' }]}>
              <Ionicons name="qr-code-outline" size={24} color="#f97316" />
            </View>
            <Text style={styles.acaoLabel}>Novo Pedido</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.acao} onPress={() => router.push('/(app)/pedidos/')}>
          <View style={[styles.acaoIcon, { backgroundColor: '#dbeafe' }]}>
            <Ionicons name="receipt-outline" size={24} color="#3b82f6" />
          </View>
          <Text style={styles.acaoLabel}>Ver Pedidos</Text>
        </TouchableOpacity>
        {can(['gerente', 'chapeiro']) && (
          <TouchableOpacity style={styles.acao} onPress={() => router.push('/(app)/kds')}>
            <View style={[styles.acaoIcon, { backgroundColor: '#f0fdf4' }]}>
              <Ionicons name="restaurant-outline" size={24} color="#16a34a" />
            </View>
            <Text style={styles.acaoLabel}>KDS Cozinha</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  )
}

function KpiCard({
  label, value, icon, color, bg, alert = false,
}: {
  label: string; value: string; icon: any; color: string; bg: string; alert?: boolean
}) {
  return (
    <View style={[styles.kpiCard, alert && styles.kpiCardAlert]}>
      <View style={[styles.kpiIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  saudacao: { fontSize: 22, fontWeight: '700', color: '#111827' },
  papel: { fontSize: 13, color: '#9ca3af', textTransform: 'capitalize', marginTop: 2 },
  caixaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 },
  caixaText: { fontSize: 12, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  kpiCard: {
    width: '47%', backgroundColor: '#fff', borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: '#f3f4f6',
  },
  kpiCardAlert: { borderColor: '#fde68a' },
  kpiIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  kpiValue: { fontSize: 22, fontWeight: '700', color: '#111827' },
  kpiLabel: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  alerta: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a',
    borderRadius: 12, padding: 14, marginBottom: 16,
  },
  alertaText: { flex: 1, fontSize: 14, color: '#92400e' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  acoes: { flexDirection: 'row', gap: 12 },
  acao: { alignItems: 'center', gap: 8 },
  acaoIcon: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  acaoLabel: { fontSize: 12, color: '#374151', fontWeight: '500' },
})

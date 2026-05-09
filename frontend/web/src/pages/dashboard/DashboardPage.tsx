import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts'
import {
  ShoppingBag, DollarSign, Table2, Package,
  TrendingUp, AlertTriangle, CheckCircle2, Clock,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { dashboardService } from '@/services/dashboardService'
import { useAuthStore } from '@/stores/authStore'
import { PageLoading } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'

const STATUS_COLORS: Record<string, string> = {
  aberto: '#3b82f6',
  em_preparo: '#f97316',
  pronto: '#22c55e',
}

export default function DashboardPage() {
  const usuario = useAuthStore((s) => s.usuario)

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardService.resumo,
    refetchInterval: 60_000,
  })

  if (isLoading) return <PageLoading />

  const kpis = data?.kpis
  const vendasSemana = data?.vendas_semana ?? []
  const topProdutos = data?.top_produtos ?? []
  const porStatus = data?.pedidos_por_status ?? {}

  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {saudacao}, {usuario?.nome?.split(' ')[0]}!
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        {kpis?.caixa_aberto ? (
          <Badge variant="success" className="text-sm px-3 py-1">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 inline" />
            Caixa aberto
          </Badge>
        ) : (
          <Badge variant="warning" className="text-sm px-3 py-1">
            <Clock className="w-3.5 h-3.5 mr-1.5 inline" />
            Caixa fechado
          </Badge>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Pedidos hoje"
          value={kpis?.pedidos_hoje ?? 0}
          icon={ShoppingBag}
          iconColor="text-blue-500"
          iconBg="bg-blue-50"
        />
        <KpiCard
          label="Receita hoje"
          value={`R$ ${(kpis?.receita_hoje ?? 0).toFixed(2)}`}
          icon={DollarSign}
          iconColor="text-green-500"
          iconBg="bg-green-50"
        />
        <KpiCard
          label="Mesas ocupadas"
          value={`${kpis?.mesas_ocupadas ?? 0} / ${kpis?.mesas_total ?? 0}`}
          icon={Table2}
          iconColor="text-brand-500"
          iconBg="bg-brand-50"
        />
        <KpiCard
          label="Pedidos em aberto"
          value={kpis?.pedidos_ativos ?? 0}
          icon={TrendingUp}
          iconColor="text-purple-500"
          iconBg="bg-purple-50"
          alert={kpis?.pedidos_ativos ? kpis.pedidos_ativos > 5 : false}
        />
      </div>

      {/* Alerta estoque baixo */}
      {(kpis?.estoque_baixo ?? 0) > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">{kpis!.estoque_baixo} produto{kpis!.estoque_baixo > 1 ? 's' : ''}</span>
            {' '}com estoque abaixo do mínimo.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gráfico vendas semana */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Receita — últimos 7 dias</h2>
          {vendasSemana.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-gray-400">
              Sem dados no período
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={vendasSemana}>
                <defs>
                  <linearGradient id="gradReceita" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="data"
                  tickFormatter={(v) => format(parseISO(v), 'dd/MM')}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `R$${v}`}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v: number) => [`R$ ${v.toFixed(2)}`, 'Receita']}
                  labelFormatter={(l) => format(parseISO(l), "dd 'de' MMM", { locale: ptBR })}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="receita"
                  stroke="#f97316"
                  strokeWidth={2}
                  fill="url(#gradReceita)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Painel direito */}
        <div className="space-y-4">
          {/* Pedidos por status */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Pedidos ativos</h2>
            {Object.keys(porStatus).length === 0 ? (
              <p className="text-sm text-gray-400">Nenhum pedido ativo</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(porStatus).map(([status, total]) => (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: STATUS_COLORS[status] ?? '#9ca3af' }}
                      />
                      <span className="text-sm text-gray-600 capitalize">
                        {status.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{total}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top produtos */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Top produtos hoje</h2>
            {topProdutos.length === 0 ? (
              <p className="text-sm text-gray-400">Sem vendas hoje</p>
            ) : (
              <div className="space-y-2">
                {topProdutos.map((p, i) => (
                  <div key={p.nome} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                    <span className="text-sm text-gray-700 flex-1 truncate">{p.nome}</span>
                    <span className="text-xs font-semibold text-brand-600">
                      ×{p.total_vendido}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  label, value, icon: Icon, iconColor, iconBg, alert = false,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  iconColor: string
  iconBg: string
  alert?: boolean
}) {
  return (
    <div className={`bg-white border rounded-2xl p-5 ${alert ? 'border-amber-200' : 'border-gray-100'}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
      </div>
    </div>
  )
}

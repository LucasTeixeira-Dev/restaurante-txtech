import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { format, subDays, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { TrendingUp, Package, DollarSign, ShoppingBag, AlertTriangle } from 'lucide-react'
import { relatorioService } from '@/services/relatorioService'
import { PageLoading } from '@/components/ui/LoadingSpinner'
import { Badge } from '@/components/ui/Badge'

const PERIODO_OPTIONS = [
  { label: '7 dias', dias: 7 },
  { label: '15 dias', dias: 15 },
  { label: '30 dias', dias: 30 },
]

const COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ec4899']

const ROTULO_FORMA: Record<string, string> = {
  dinheiro: 'Dinheiro',
  debito: 'Débito',
  credito: 'Crédito',
  pix: 'Pix',
  nao_informado: 'Antes das contas',
}

export default function RelatoriosPage() {
  const [periodo, setPeriodo] = useState(7)

  const dataFim = format(new Date(), 'yyyy-MM-dd')
  const dataInicio = format(subDays(new Date(), periodo - 1), 'yyyy-MM-dd')
  const filtro = { data_inicio: dataInicio, data_fim: dataFim }

  const { data: vendas = [], isLoading: loadingVendas } = useQuery({
    queryKey: ['relatorio-vendas', filtro],
    queryFn: () => relatorioService.vendas(filtro),
  })

  const { data: topProdutos = [], isLoading: loadingTop } = useQuery({
    queryKey: ['relatorio-produtos', filtro],
    queryFn: () => relatorioService.produtosMaisVendidos(filtro),
  })

  const { data: financeiro, isLoading: loadingFin } = useQuery({
    queryKey: ['relatorio-financeiro', filtro],
    queryFn: () => relatorioService.financeiro(filtro),
  })

  const { data: estoqueItens = [], isLoading: loadingEstoque } = useQuery({
    queryKey: ['relatorio-estoque'],
    queryFn: relatorioService.estoque,
  })

  const isLoading = loadingVendas || loadingTop || loadingFin || loadingEstoque
  if (isLoading) return <PageLoading />

  const receitaTotal = vendas.reduce((s, v) => s + Number(v.receita), 0)
  const pedidosTotal = vendas.reduce((s, v) => s + Number(v.pedidos), 0)
  const estoqueBaixo = estoqueItens.filter((e) => e.abaixo_minimo)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {format(parseISO(dataInicio), "dd 'de' MMM", { locale: ptBR })} —{' '}
            {format(parseISO(dataFim), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {PERIODO_OPTIONS.map((op) => (
            <button
              key={op.dias}
              onClick={() => setPeriodo(op.dias)}
              className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                periodo === op.dias
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {op.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Receita total"
          value={`R$ ${receitaTotal.toFixed(2)}`}
          icon={DollarSign}
          iconColor="text-green-500"
          iconBg="bg-green-50"
        />
        <KpiCard
          label="Total de pedidos"
          value={pedidosTotal}
          icon={ShoppingBag}
          iconColor="text-blue-500"
          iconBg="bg-blue-50"
        />
        <KpiCard
          label="Ticket médio"
          value={financeiro ? `R$ ${Number(financeiro.ticket_medio).toFixed(2)}` : '—'}
          icon={TrendingUp}
          iconColor="text-brand-500"
          iconBg="bg-brand-50"
        />
        <KpiCard
          label="Itens c/ estoque baixo"
          value={estoqueBaixo.length}
          icon={Package}
          iconColor="text-amber-500"
          iconBg="bg-amber-50"
          alert={estoqueBaixo.length > 0}
        />
      </div>

      {/* Recebimentos por forma de pagamento (contas pagas no período) */}
      {financeiro && Object.keys(financeiro.por_forma_pagamento ?? {}).length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            Recebido por forma de pagamento · {financeiro.contas_pagas} conta(s)
            {financeiro.taxa_servico_total > 0 && (
              <span className="font-normal text-gray-500"> · taxa de serviço R$ {Number(financeiro.taxa_servico_total).toFixed(2)}</span>
            )}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Object.entries(financeiro.por_forma_pagamento).map(([forma, valor]) => (
              <div key={forma} className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-500">{ROTULO_FORMA[forma] ?? forma}</p>
                <p className="text-lg font-bold text-gray-900">R$ {Number(valor).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico receita */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Receita por dia</h2>
          {vendas.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-gray-400">Sem dados</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={vendas}>
                <defs>
                  <linearGradient id="gradRel" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="data"
                  tickFormatter={(v) => format(parseISO(v), 'dd/MM')}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `R$${v}`}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip
                  formatter={(v: number) => [`R$ ${v.toFixed(2)}`, 'Receita']}
                  labelFormatter={(l) => format(parseISO(l), "dd 'de' MMM", { locale: ptBR })}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                />
                <Area type="monotone" dataKey="receita" stroke="#f97316" strokeWidth={2} fill="url(#gradRel)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Gráfico pedidos */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Pedidos por dia</h2>
          {vendas.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-gray-400">Sem dados</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={vendas}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="data"
                  tickFormatter={(v) => format(parseISO(v), 'dd/MM')}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false} tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  formatter={(v: number) => [v, 'Pedidos']}
                  labelFormatter={(l) => format(parseISO(l), "dd 'de' MMM", { locale: ptBR })}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }}
                />
                <Bar dataKey="pedidos" radius={[4, 4, 0, 0]}>
                  {vendas.map((_, i) => (
                    <Cell key={i} fill="#3b82f6" fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recebimentos por forma de pagamento (contas pagas no período) */}
      {financeiro && Object.keys(financeiro.por_forma_pagamento ?? {}).length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            Recebido por forma de pagamento · {financeiro.contas_pagas} conta(s)
            {financeiro.taxa_servico_total > 0 && (
              <span className="font-normal text-gray-500"> · taxa de serviço R$ {Number(financeiro.taxa_servico_total).toFixed(2)}</span>
            )}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {Object.entries(financeiro.por_forma_pagamento).map(([forma, valor]) => (
              <div key={forma} className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-500">{ROTULO_FORMA[forma] ?? forma}</p>
                <p className="text-lg font-bold text-gray-900">R$ {Number(valor).toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top produtos */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Produtos mais vendidos</h2>
          {topProdutos.length === 0 ? (
            <p className="text-sm text-gray-400">Sem dados no período.</p>
          ) : (
            <div className="space-y-3">
              {topProdutos.slice(0, 8).map((p, i) => {
                const max = topProdutos[0]?.total_vendido ?? 1
                const pct = Math.round((Number(p.total_vendido) / Number(max)) * 100)
                return (
                  <div key={p.nome}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                        <span className="text-sm text-gray-700 truncate max-w-xs">{p.nome}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-gray-400">×{p.total_vendido}</span>
                        <span className="text-xs font-semibold text-brand-600">
                          R$ {Number(p.receita).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Estoque baixo */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Status do estoque</h2>
            {estoqueBaixo.length > 0 && (
              <Badge variant="warning" className="text-xs">
                <AlertTriangle className="w-3 h-3 mr-1 inline" />
                {estoqueBaixo.length} abaixo do mínimo
              </Badge>
            )}
          </div>
          {estoqueItens.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum produto com controle de estoque.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {estoqueItens.map((e) => (
                <div
                  key={e.produto}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                    e.abaixo_minimo ? 'bg-red-50' : 'bg-gray-50'
                  }`}
                >
                  <span className={`truncate ${e.abaixo_minimo ? 'text-red-700 font-medium' : 'text-gray-700'}`}>
                    {e.produto}
                  </span>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className={`font-semibold ${e.abaixo_minimo ? 'text-red-600' : 'text-gray-900'}`}>
                      {e.quantidade}
                    </span>
                    <span className="text-gray-400">/ {e.quantidade_minima}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
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

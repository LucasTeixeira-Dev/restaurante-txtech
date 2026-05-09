import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, RefreshCw, Clock, Table2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { pedidoService } from '@/services/pedidoService'
import { useAuthStore } from '@/stores/authStore'
import { Badge, statusPedidoBadge } from '@/components/ui/Badge'
import { PageLoading } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import type { StatusPedido, Pedido } from '@/types'

const TABS: { label: string; value: StatusPedido | 'todos' }[] = [
  { label: 'Todos', value: 'todos' },
  { label: 'Abertos', value: 'aberto' },
  { label: 'Em preparo', value: 'em_preparo' },
  { label: 'Prontos', value: 'pronto' },
  { label: 'Entregues', value: 'entregue' },
  { label: 'Cancelados', value: 'cancelado' },
]

export default function PedidosPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const can = useAuthStore((s) => s.can)
  const [tab, setTab] = useState<StatusPedido | 'todos'>('todos')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['pedidos', tab],
    queryFn: () =>
      pedidoService.listar({ ...(tab !== 'todos' ? { status: tab } : {}), per_page: 50 }),
    refetchInterval: 15_000,
  })

  const pedidos: Pedido[] = data?.data ?? []

  const { mutate: atualizarStatus } = useMutation({
    mutationFn: ({ id, status }: { id: number; status: StatusPedido }) =>
      pedidoService.atualizarStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
      toast.success('Status atualizado.')
    },
    onError: () => toast.error('Erro ao atualizar status.'),
  })

  const proximoStatus: Record<string, StatusPedido | null> = {
    aberto: 'em_preparo',
    em_preparo: 'pronto',
    pronto: 'entregue',
    entregue: null,
    cancelado: null,
  }

  if (isLoading) return <PageLoading />

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{data?.meta?.total ?? 0} pedidos</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {can(['gerente', 'garcom']) && (
            <button
              onClick={() => navigate('/pedidos/novo')}
              className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo Pedido
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              tab === value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {pedidos.length === 0 ? (
        <EmptyState
          title="Nenhum pedido"
          description="Nenhum pedido encontrado nesta categoria."
          action={
            can(['gerente', 'garcom']) ? (
              <button
                onClick={() => navigate('/pedidos/novo')}
                className="flex items-center gap-2 bg-brand-500 text-white text-sm font-medium px-4 py-2 rounded-lg"
              >
                <Plus className="w-4 h-4" />
                Novo pedido
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {pedidos.map((pedido) => {
            const { label, variant } = statusPedidoBadge(pedido.status)
            const prox = proximoStatus[pedido.status]
            return (
              <div
                key={pedido.id}
                className="bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors cursor-pointer"
                onClick={() => navigate(`/pedidos/${pedido.id}`)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-brand-600">#{pedido.id}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={variant}>{label}</Badge>
                        {pedido.mesa && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <Table2 className="w-3 h-3" />
                            Mesa {pedido.mesa.numero}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {pedido.itens?.length ?? 0} {pedido.itens?.length === 1 ? 'item' : 'itens'}
                        {pedido.usuario && ` · ${pedido.usuario.nome}`}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(pedido.criado_em), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-lg font-bold text-gray-900">
                      R$ {pedido.total.toFixed(2)}
                    </span>
                    {prox && can(['gerente', 'garcom', 'chapeiro']) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          atualizarStatus({ id: pedido.id, status: prox })
                        }}
                        className="text-xs bg-brand-500 hover:bg-brand-600 text-white px-2.5 py-1 rounded-lg transition-colors"
                      >
                        → {statusPedidoBadge(prox).label}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Clock, CheckCircle2, ChefHat } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { pedidoService } from '@/services/pedidoService'
import { useEchoChannel } from '@/hooks/useEcho'
import { Badge, statusItemBadge } from '@/components/ui/Badge'
import { PageLoading } from '@/components/ui/LoadingSpinner'
import type { Pedido, StatusItemPedido } from '@/types'

// Pedidos relevantes para a cozinha são os que não estão entregues/cancelados
const STATUS_COZINHA = ['aberto', 'em_preparo']

export default function KdsPage() {
  const queryClient = useQueryClient()
  const [agora] = useState(new Date())

  const { data, isLoading } = useQuery({
    queryKey: ['kds-pedidos'],
    queryFn: () => pedidoService.listar({ per_page: 50 }),
    select: (d) => d.data.filter((p) => STATUS_COZINHA.includes(p.status)),
    refetchInterval: 20_000,
  })

  const pedidos: Pedido[] = data ?? []

  const { mutate: atualizarItem } = useMutation({
    mutationFn: ({ pedidoId, itemId, status }: { pedidoId: number; itemId: number; status: StatusItemPedido }) =>
      pedidoService.atualizarStatusItem(pedidoId, itemId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kds-pedidos'] })
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
    },
    onError: () => toast.error('Erro ao atualizar item.'),
  })

  const { mutate: atualizarPedido } = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'pronto' }) =>
      pedidoService.atualizarStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kds-pedidos'] })
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
      toast.success('Pedido marcado como pronto!')
    },
    onError: () => toast.error('Erro ao marcar pedido como pronto.'),
  })

  // Recebe novos pedidos em tempo real
  const handlePedidoCriado = useCallback(
    (data: any) => {
      toast('Novo pedido recebido!', { icon: '🔔' })
      queryClient.invalidateQueries({ queryKey: ['kds-pedidos'] })
    },
    [queryClient],
  )

  // Recebe atualizações de status em tempo real
  const handleStatusAtualizado = useCallback(
    () => {
      queryClient.invalidateQueries({ queryKey: ['kds-pedidos'] })
    },
    [queryClient],
  )

  useEchoChannel('pedidos', 'pedido.criado', handlePedidoCriado)
  useEchoChannel('pedidos', 'pedido.status_atualizado', handleStatusAtualizado)
  useEchoChannel('pedidos', 'item.status_atualizado', handleStatusAtualizado)

  const proximoStatusItem = (status: StatusItemPedido): StatusItemPedido | null => {
    const fluxo: StatusItemPedido[] = ['pendente', 'em_preparo', 'pronto']
    const idx = fluxo.indexOf(status)
    return idx >= 0 && idx < fluxo.length - 1 ? fluxo[idx + 1] : null
  }

  const minutosDesde = (iso: string) => {
    const diff = Math.floor((agora.getTime() - new Date(iso).getTime()) / 60000)
    return diff
  }

  const urgente = (iso: string) => minutosDesde(iso) >= 15

  if (isLoading) return <PageLoading />

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      {/* Header KDS */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center">
            <ChefHat className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">KDS — Cozinha</h1>
            <p className="text-xs text-gray-400">{pedidos.length} pedido{pedidos.length !== 1 ? 's' : ''} em aberto</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          Ao vivo
        </div>
      </div>

      {pedidos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-400 mb-4" />
          <p className="text-lg font-semibold text-white">Tudo em dia!</p>
          <p className="text-sm text-gray-400 mt-1">Nenhum pedido aguardando preparo.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {pedidos
            .sort((a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime())
            .map((pedido) => {
              const mins = minutosDesde(pedido.criado_em)
              const isUrgente = urgente(pedido.criado_em)
              const todosItensProon = pedido.itens?.every((i) => i.status === 'pronto')

              return (
                <div
                  key={pedido.id}
                  className={`rounded-2xl overflow-hidden flex flex-col ${
                    isUrgente ? 'ring-2 ring-red-400' : 'ring-1 ring-white/10'
                  } bg-gray-800`}
                >
                  {/* Card header */}
                  <div
                    className={`px-4 py-3 flex items-center justify-between ${
                      isUrgente ? 'bg-red-500' : 'bg-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold">#{pedido.id}</span>
                      {pedido.mesa && (
                        <span className="text-sm text-white/80">· Mesa {pedido.mesa.numero}</span>
                      )}
                    </div>
                    <div className={`flex items-center gap-1 text-xs font-medium ${isUrgente ? 'text-white' : 'text-gray-300'}`}>
                      <Clock className="w-3 h-3" />
                      {mins}min
                    </div>
                  </div>

                  {/* Itens */}
                  <div className="flex-1 p-3 space-y-2">
                    {pedido.itens
                      ?.filter((i) => i.status !== 'cancelado')
                      .map((item) => {
                        const { label, variant } = statusItemBadge(item.status)
                        const prox = proximoStatusItem(item.status as StatusItemPedido)
                        return (
                          <div
                            key={item.id}
                            className={`flex items-start justify-between gap-2 p-2.5 rounded-xl ${
                              item.status === 'pronto' ? 'bg-green-900/30' : 'bg-gray-700/50'
                            }`}
                          >
                            <div className="min-w-0">
                              <p className={`text-sm font-semibold ${item.status === 'pronto' ? 'text-green-300 line-through' : 'text-white'}`}>
                                <span className="text-brand-400 mr-1">x{item.quantidade}</span>
                                {item.produto?.nome}
                              </p>
                              {item.observacoes && (
                                <p className="text-xs text-yellow-300 mt-0.5">⚠ {item.observacoes}</p>
                              )}
                              <Badge variant={variant} className="mt-1 text-xs">{label}</Badge>
                            </div>
                            {prox && (
                              <button
                                onClick={() =>
                                  atualizarItem({ pedidoId: pedido.id, itemId: item.id, status: prox })
                                }
                                className="shrink-0 px-2 py-1 text-xs bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors"
                              >
                                {prox === 'em_preparo' ? 'Iniciar' : 'Pronto'}
                              </button>
                            )}
                          </div>
                        )
                      })}
                  </div>

                  {/* Observações */}
                  {pedido.observacoes && (
                    <div className="px-3 py-2 bg-yellow-900/20 border-t border-yellow-500/20">
                      <p className="text-xs text-yellow-300">⚠ {pedido.observacoes}</p>
                    </div>
                  )}

                  {/* Botão marcar pedido como pronto */}
                  {pedido.status !== 'pronto' && todosItensProon && (
                    <button
                      onClick={() => atualizarPedido({ id: pedido.id, status: 'pronto' })}
                      className="w-full py-3 bg-green-500 hover:bg-green-600 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Marcar Pedido como Pronto
                    </button>
                  )}
                </div>
              )
            })}
        </div>
      )}
    </div>
  )
}

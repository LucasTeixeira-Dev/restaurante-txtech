import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Clock, Table2, User, ChevronRight } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { pedidoService } from '@/services/pedidoService'
import { useAuthStore } from '@/stores/authStore'
import { Badge, statusPedidoBadge, statusItemBadge } from '@/components/ui/Badge'
import { PageLoading } from '@/components/ui/LoadingSpinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useState } from 'react'
import type { StatusPedido, StatusItemPedido } from '@/types'

const FLUXO_PEDIDO: StatusPedido[] = ['aberto', 'em_preparo', 'pronto', 'entregue']
const FLUXO_ITEM: StatusItemPedido[] = ['pendente', 'em_preparo', 'pronto']

export default function DetalhesPedidoPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const can = useAuthStore((s) => s.can)
  const [confirmCancelar, setConfirmCancelar] = useState(false)

  const { data: pedido, isLoading } = useQuery({
    queryKey: ['pedido', id],
    queryFn: () => pedidoService.buscar(Number(id)),
    refetchInterval: 10_000,
  })

  const { mutate: atualizarStatus, isPending: atualizando } = useMutation({
    mutationFn: (status: StatusPedido) => pedidoService.atualizarStatus(Number(id), status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedido', id] })
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
      queryClient.invalidateQueries({ queryKey: ['mesas'] })
      toast.success('Status atualizado.')
    },
    onError: () => toast.error('Erro ao atualizar status.'),
  })

  const { mutate: atualizarStatusItem } = useMutation({
    mutationFn: ({ itemId, status }: { itemId: number; status: StatusItemPedido }) =>
      pedidoService.atualizarStatusItem(Number(id), itemId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedido', id] })
      toast.success('Item atualizado.')
    },
    onError: () => toast.error('Erro ao atualizar item.'),
  })

  const { mutate: cancelar, isPending: cancelando } = useMutation({
    mutationFn: () => pedidoService.cancelar(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
      toast.success('Pedido cancelado.')
      navigate('/pedidos')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao cancelar.'),
  })

  if (isLoading || !pedido) return <PageLoading />

  const { label: statusLabel, variant: statusVariant } = statusPedidoBadge(pedido.status)
  const idxAtual = FLUXO_PEDIDO.indexOf(pedido.status as StatusPedido)
  const proximoStatus = idxAtual >= 0 && idxAtual < FLUXO_PEDIDO.length - 1
    ? FLUXO_PEDIDO[idxAtual + 1]
    : null

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Pedido #{pedido.id}</h1>
            <Badge variant={statusVariant}>{statusLabel}</Badge>
          </div>
          <p className="text-sm text-gray-400 mt-0.5 flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(pedido.criado_em), { addSuffix: true, locale: ptBR })}
            {' · '}
            {format(new Date(pedido.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {pedido.mesa && (
          <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3">
            <Table2 className="w-5 h-5 text-brand-500 shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Mesa</p>
              <p className="text-sm font-semibold text-gray-900">{pedido.mesa.numero}</p>
            </div>
          </div>
        )}
        {pedido.usuario && (
          <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3">
            <User className="w-5 h-5 text-brand-500 shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Atendente</p>
              <p className="text-sm font-semibold text-gray-900">{pedido.usuario.nome}</p>
            </div>
          </div>
        )}
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-xs text-gray-400">Total</p>
          <p className="text-xl font-bold text-gray-900">R$ {pedido.total.toFixed(2)}</p>
        </div>
      </div>

      {/* Barra de progresso do status */}
      {pedido.status !== 'cancelado' && (
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500 mb-3">Progresso</p>
          <div className="flex items-center gap-1">
            {FLUXO_PEDIDO.map((s, idx) => {
              const { label } = statusPedidoBadge(s)
              const ativo = idx <= idxAtual
              const atual = s === pedido.status
              return (
                <div key={s} className="flex items-center flex-1">
                  <div className={`flex flex-col items-center flex-1 ${idx > 0 ? '' : ''}`}>
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                        atual
                          ? 'bg-brand-500 text-white ring-2 ring-brand-200'
                          : ativo
                          ? 'bg-brand-200 text-brand-700'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <span className={`text-xs mt-1 ${ativo ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                      {label}
                    </span>
                  </div>
                  {idx < FLUXO_PEDIDO.length - 1 && (
                    <div className={`h-0.5 flex-1 mb-4 ${ativo && idx < idxAtual ? 'bg-brand-300' : 'bg-gray-100'}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Itens */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-900">
            Itens ({pedido.itens?.length ?? 0})
          </p>
        </div>
        <div className="divide-y divide-gray-50">
          {pedido.itens?.map((item) => {
            const { label: itemLabel, variant: itemVariant } = statusItemBadge(item.status)
            const idxItem = FLUXO_ITEM.indexOf(item.status as StatusItemPedido)
            const proximoItem = idxItem >= 0 && idxItem < FLUXO_ITEM.length - 1
              ? FLUXO_ITEM[idxItem + 1]
              : null

            return (
              <div key={item.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="text-sm font-semibold text-brand-500 shrink-0 pt-0.5">
                    x{item.quantidade}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {item.produto?.nome ?? `Produto #${item.produto_id}`}
                    </p>
                    {item.observacoes && (
                      <p className="text-xs text-gray-400 italic">"{item.observacoes}"</p>
                    )}
                    <Badge variant={itemVariant} className="mt-1">{itemLabel}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold text-gray-900">
                    R$ {item.subtotal.toFixed(2)}
                  </span>
                  {proximoItem && can(['gerente', 'chapeiro']) && (
                    <button
                      onClick={() => atualizarStatusItem({ itemId: item.id, status: proximoItem })}
                      className="text-xs text-brand-500 hover:text-brand-700 flex items-center gap-0.5"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Observações */}
      {pedido.observacoes && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          <p className="text-xs font-medium text-amber-700 mb-0.5">Observações</p>
          <p className="text-sm text-amber-800">{pedido.observacoes}</p>
        </div>
      )}

      {/* Ações */}
      {pedido.status !== 'entregue' && pedido.status !== 'cancelado' && (
        <div className="flex items-center gap-3">
          {proximoStatus && can(['gerente', 'garcom', 'chapeiro']) && (
            <button
              onClick={() => atualizarStatus(proximoStatus)}
              disabled={atualizando}
              className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white text-sm font-semibold py-3 rounded-xl transition-colors"
            >
              {atualizando ? 'Atualizando...' : `→ ${statusPedidoBadge(proximoStatus).label}`}
            </button>
          )}
          {pedido.status === 'aberto' && can(['gerente']) && (
            <button
              onClick={() => setConfirmCancelar(true)}
              className="px-4 py-3 border border-red-200 text-red-500 hover:bg-red-50 rounded-xl text-sm font-medium transition-colors"
            >
              Cancelar
            </button>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmCancelar}
        onClose={() => setConfirmCancelar(false)}
        onConfirm={() => cancelar()}
        loading={cancelando}
        title="Cancelar pedido?"
        description="Esta ação não pode ser desfeita. O pedido será marcado como cancelado."
        confirmLabel="Sim, cancelar"
      />
    </div>
  )
}

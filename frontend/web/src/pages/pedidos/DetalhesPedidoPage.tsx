import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Clock, Table2, User, ChevronRight, Plus, Trash2 } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { pedidoService } from '@/services/pedidoService'
import { produtoService } from '@/services/produtoService'
import { contaService } from '@/services/contaService'
import { useAuthStore } from '@/stores/authStore'
import { Badge, statusPedidoBadge, statusItemBadge } from '@/components/ui/Badge'
import { PageLoading } from '@/components/ui/LoadingSpinner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Modal } from '@/components/ui/Modal'
import { useState } from 'react'
import { PAPEIS_POR_STATUS } from '@/types'
import type { StatusPedido, StatusItemPedido } from '@/types'

const erroApi = (e: any, padrao: string) => e?.response?.data?.message ?? padrao

const NOVO_ITEM = { produtoId: '', quantidade: 1, observacoes: '' }

const FLUXO_PEDIDO: StatusPedido[] = ['aberto', 'em_preparo', 'pronto', 'entregue']
const FLUXO_ITEM: StatusItemPedido[] = ['pendente', 'em_preparo', 'pronto']

export default function DetalhesPedidoPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const can = useAuthStore((s) => s.can)
  const [confirmCancelar, setConfirmCancelar] = useState(false)
  const [modalItem, setModalItem] = useState(false)
  const [novoItem, setNovoItem] = useState(NOVO_ITEM)

  const { data: pedido, isLoading } = useQuery({
    queryKey: ['pedido', id],
    queryFn: () => pedidoService.buscar(Number(id)),
    refetchInterval: 10_000,
  })

  // Cardápio só é buscado quando o modal de adicionar item abre.
  const { data: cardapio = [] } = useQuery({
    queryKey: ['cardapio'],
    queryFn: produtoService.cardapio,
    enabled: modalItem,
  })

  const atualizarTelas = () => {
    queryClient.invalidateQueries({ queryKey: ['pedido', id] })
    queryClient.invalidateQueries({ queryKey: ['pedidos'] })
    queryClient.invalidateQueries({ queryKey: ['mesas'] })
  }

  const { mutate: atualizarStatus, isPending: atualizando } = useMutation({
    mutationFn: (status: StatusPedido) => pedidoService.atualizarStatus(Number(id), status),
    onSuccess: () => {
      atualizarTelas()
      toast.success('Status atualizado.')
    },
    onError: (e: any) => toast.error(erroApi(e, 'Erro ao atualizar status.')),
  })

  const { mutate: atualizarStatusItem } = useMutation({
    mutationFn: ({ itemId, status }: { itemId: number; status: StatusItemPedido }) =>
      pedidoService.atualizarStatusItem(Number(id), itemId, status),
    onSuccess: () => {
      atualizarTelas()
      toast.success('Item atualizado.')
    },
    onError: (e: any) => toast.error(erroApi(e, 'Erro ao atualizar item.')),
  })

  const { mutate: adicionarItem, isPending: adicionando } = useMutation({
    mutationFn: () =>
      pedidoService.adicionarItens(Number(id), [{
        produto_id: Number(novoItem.produtoId),
        quantidade: novoItem.quantidade,
        observacoes: novoItem.observacoes || undefined,
      }]),
    onSuccess: () => {
      atualizarTelas()
      toast.success('Item adicionado.')
      setModalItem(false)
      setNovoItem(NOVO_ITEM)
    },
    // Ex.: "Estoque insuficiente para Refrigerante (disponível: 1)."
    onError: (e: any) => toast.error(erroApi(e, 'Erro ao adicionar item.')),
  })

  // Atendimento manual: o garçom avisa o caixa que a mesa quer fechar a conta.
  const { mutate: pedirConta, isPending: pedindoConta } = useMutation({
    mutationFn: () => contaService.solicitarFechamento(pedido!.conta_id!),
    onSuccess: () => toast.success('Caixa avisado: a mesa pediu a conta.'),
    onError: (e: any) => toast.error(erroApi(e, 'Erro ao pedir a conta.')),
  })

  const { mutate: removerItem } = useMutation({
    mutationFn: (itemId: number) => pedidoService.removerItem(Number(id), itemId),
    onSuccess: () => {
      atualizarTelas()
      toast.success('Item removido.')
    },
    onError: (e: any) => toast.error(erroApi(e, 'Erro ao remover item.')),
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
  const encerrado = pedido.status === 'entregue' || pedido.status === 'cancelado'
  // Botões só aparecem para quem a API aceita (ex.: chapeiro não entrega, garçom não prepara).
  const podeAvancar = !!proximoStatus && can(PAPEIS_POR_STATUS[proximoStatus] ?? [])
  const podeCancelar = !encerrado && can(PAPEIS_POR_STATUS.cancelado ?? [])
  const podeEditarItens = !encerrado && can(['gerente', 'garcom'])
  // Cada setor só avança os próprios itens (a API também valida).
  const usuarioPapel = useAuthStore.getState().usuario?.papel
  const podeAvancarItem = (setor: string) =>
    usuarioPapel === 'gerente' ||
    (usuarioPapel === 'chapeiro' && setor === 'cozinha') ||
    (usuarioPapel === 'bar' && setor === 'bar')

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
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-900">
            Itens ({pedido.itens?.length ?? 0})
          </p>
          {podeEditarItens && (
            <button
              onClick={() => setModalItem(true)}
              className="flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar item
            </button>
          )}
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
                  {podeEditarItens && item.status === 'pendente' && (
                    <button
                      onClick={() => removerItem(item.id)}
                      title="Remover item (ainda não foi para a cozinha)"
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {proximoItem && !encerrado && podeAvancarItem(item.setor) && (
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
      {!encerrado && (
        <div className="flex items-center gap-3">
          {podeAvancar && proximoStatus && (
            <button
              onClick={() => atualizarStatus(proximoStatus)}
              disabled={atualizando}
              className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white text-sm font-semibold py-3 rounded-xl transition-colors"
            >
              {atualizando ? 'Atualizando...' : `→ ${statusPedidoBadge(proximoStatus).label}`}
            </button>
          )}
          {pedido.conta_id && pedido.mesa && can(['gerente', 'garcom', 'caixa']) && (
            <button
              onClick={() => pedirConta()}
              disabled={pedindoConta}
              className="px-4 py-3 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-sm font-medium transition-colors"
            >
              Pedir a conta da mesa
            </button>
          )}
          {podeCancelar && (
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
        description="Esta ação não pode ser desfeita. O pedido será cancelado, o estoque devolvido e a mesa liberada."
        confirmLabel="Sim, cancelar"
      />

      <Modal
        open={modalItem}
        onClose={() => setModalItem(false)}
        title={`Adicionar item ao pedido #${pedido.id}`}
        size="md"
        footer={
          <>
            <button
              onClick={() => setModalItem(false)}
              className="px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={() => adicionarItem()}
              disabled={adicionando || !novoItem.produtoId || novoItem.quantidade < 1}
              className="px-4 py-2 text-sm text-white bg-brand-500 hover:bg-brand-600 rounded-lg disabled:opacity-50"
            >
              {adicionando ? 'Adicionando...' : 'Adicionar'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Produto *</label>
            <select
              value={novoItem.produtoId}
              onChange={(e) => setNovoItem({ ...novoItem, produtoId: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Selecione...</option>
              {cardapio.map((cat) => (
                <optgroup key={cat.id} label={cat.nome}>
                  {cat.produtos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} — R$ {Number(p.preco).toFixed(2)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Quantidade *</label>
            <input
              type="number"
              min={1}
              max={999}
              value={novoItem.quantidade}
              onChange={(e) => setNovoItem({ ...novoItem, quantidade: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Observação</label>
            <input
              type="text"
              maxLength={255}
              placeholder="Ex.: sem cebola"
              value={novoItem.observacoes}
              onChange={(e) => setNovoItem({ ...novoItem, observacoes: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}

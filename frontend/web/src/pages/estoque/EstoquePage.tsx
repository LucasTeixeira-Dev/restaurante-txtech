import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, ArrowUpCircle, ArrowDownCircle, SlidersHorizontal, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import { estoqueService } from '@/services/estoqueService'
import type { MovimentacaoPayload } from '@/services/estoqueService'
import { PageLoading } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import type { Estoque } from '@/types'

const TIPO_OPTIONS = [
  { value: 'entrada', label: 'Entrada', icon: ArrowUpCircle, color: 'text-green-500' },
  { value: 'saida', label: 'Saída', icon: ArrowDownCircle, color: 'text-red-500' },
  { value: 'ajuste', label: 'Ajuste', icon: SlidersHorizontal, color: 'text-blue-500' },
]

export default function EstoquePage() {
  const queryClient = useQueryClient()
  const [busca, setBusca] = useState('')
  const [apenasAbaixo, setApenasAbaixo] = useState(false)
  const [movModal, setMovModal] = useState<Estoque | null>(null)
  const [movForm, setMovForm] = useState<MovimentacaoPayload>({
    tipo: 'entrada', quantidade: 1, motivo: '',
  })

  const { data: itens = [], isLoading } = useQuery({
    queryKey: ['estoque', apenasAbaixo],
    queryFn: () => estoqueService.listar(apenasAbaixo ? { abaixo_minimo: true } : {}),
  })

  const filtrados = busca
    ? itens.filter((item: Estoque) => item.produto?.nome?.toLowerCase().includes(busca.toLowerCase()))
    : itens

  const { mutate: movimentar, isPending: movendo } = useMutation({
    mutationFn: () => estoqueService.movimentar(movModal!.produto_id, movForm),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['estoque'] })
      toast.success('Movimentação registrada.')
      setMovModal(null)
      setMovForm({ tipo: 'entrada', quantidade: 1, motivo: '' })
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao registrar movimentação.'),
  })

  const abrirMovimentacao = (item: Estoque) => {
    setMovForm({ tipo: 'entrada', quantidade: 1, motivo: '' })
    setMovModal(item)
  }

  if (isLoading) return <PageLoading />

  const totalAbaixo = itens.filter((e) => e.quantidade <= e.quantidade_minima).length

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estoque</h1>
          <p className="text-sm text-gray-500 mt-0.5">{itens.length} produto{itens.length !== 1 ? 's' : ''} controlados</p>
        </div>
        {totalAbaixo > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm px-3 py-2 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span><span className="font-semibold">{totalAbaixo}</span> abaixo do mínimo</span>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar produto..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2">
          <input
            type="checkbox"
            checked={apenasAbaixo}
            onChange={(e) => setApenasAbaixo(e.target.checked)}
            className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
          />
          Apenas abaixo do mínimo
        </label>
      </div>

      {/* Tabela */}
      {filtrados.length === 0 ? (
        <EmptyState title="Nenhum item encontrado" />
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Produto</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3 hidden md:table-cell">Categoria</th>
                <th className="text-center text-xs font-medium text-gray-500 px-5 py-3">Quantidade</th>
                <th className="text-center text-xs font-medium text-gray-500 px-5 py-3 hidden sm:table-cell">Mínimo</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Status</th>
                <th className="text-right text-xs font-medium text-gray-500 px-5 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtrados.map((e) => {
                const abaixo = e.quantidade <= e.quantidade_minima
                return (
                  <tr key={e.id} className={`hover:bg-gray-50 transition-colors ${abaixo ? 'bg-red-50/30' : ''}`}>
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {e.produto?.nome ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-500 hidden md:table-cell">
                      {e.produto?.categoria?.nome ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`text-lg font-bold ${abaixo ? 'text-red-600' : 'text-gray-900'}`}>
                        {e.quantidade}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center text-gray-400 hidden sm:table-cell">
                      {e.quantidade_minima}
                    </td>
                    <td className="px-5 py-3">
                      {abaixo ? (
                        <Badge variant="danger" className="text-xs">
                          <AlertTriangle className="w-3 h-3 mr-1 inline" />
                          Crítico
                        </Badge>
                      ) : (
                        <Badge variant="success" className="text-xs">Normal</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => abrirMovimentacao(e)}
                          className="text-xs text-brand-600 hover:text-brand-700 font-medium px-2 py-1 rounded hover:bg-brand-50 transition-colors"
                        >
                          Movimentar
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal movimentação */}
      <Modal
        open={!!movModal}
        onClose={() => setMovModal(null)}
        title={`Movimentar — ${movModal?.produto?.nome ?? ''}`}
        size="sm"
        footer={
          <>
            <button onClick={() => setMovModal(null)} className="px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
            <button
              onClick={() => movimentar()}
              disabled={movendo}
              className="px-4 py-2 text-sm text-white bg-brand-500 hover:bg-brand-600 rounded-lg disabled:opacity-50"
            >
              {movendo ? 'Salvando...' : 'Registrar'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Tipo */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Tipo de movimentação</label>
            <div className="grid grid-cols-3 gap-2">
              {TIPO_OPTIONS.map((op) => {
                const Icon = op.icon
                const selected = movForm.tipo === op.value
                return (
                  <button
                    key={op.value}
                    onClick={() => setMovForm({ ...movForm, tipo: op.value as any })}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-medium transition-all ${
                      selected
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${selected ? 'text-brand-500' : op.color}`} />
                    {op.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Quantidade */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Quantidade {movModal && (
                <span className="text-gray-400 font-normal">(atual: {movModal.quantidade})</span>
              )}
            </label>
            <input
              type="number"
              min="1"
              value={movForm.quantidade}
              onChange={(e) => setMovForm({ ...movForm, quantidade: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Observações</label>
            <textarea
              rows={2}
              placeholder="Opcional..."
              value={movForm.motivo}
              onChange={(e) => setMovForm({ ...movForm, motivo: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}

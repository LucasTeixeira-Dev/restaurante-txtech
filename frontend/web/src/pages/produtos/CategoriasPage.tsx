import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, Trash2, GripVertical } from 'lucide-react'
import toast from 'react-hot-toast'
import { categoriaService } from '@/services/categoriaService'
import { PageLoading } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Badge } from '@/components/ui/Badge'
import { useAuthStore } from '@/stores/authStore'
import type { Categoria } from '@/types'

const VAZIO = { nome: '', descricao: '', setor: 'cozinha', ativo: true, ordem: 0 }

export default function CategoriasPage() {
  const queryClient = useQueryClient()
  const can = useAuthStore((s) => s.can)
  const [modal, setModal] = useState<{ open: boolean; categoria?: Categoria }>({ open: false })
  const [confirmarRemover, setConfirmarRemover] = useState<Categoria | null>(null)
  const [form, setForm] = useState<any>({ ...VAZIO })

  const { data: categorias = [], isLoading } = useQuery({
    queryKey: ['categorias'],
    queryFn: categoriaService.listar,
  })

  const { mutate: salvar, isPending: salvando } = useMutation({
    mutationFn: (data: any) =>
      modal.categoria
        ? categoriaService.atualizar(modal.categoria.id, data)
        : categoriaService.criar(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias'] })
      toast.success(modal.categoria ? 'Categoria atualizada.' : 'Categoria criada.')
      fecharModal()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao salvar categoria.'),
  })

  const { mutate: remover, isPending: removendo } = useMutation({
    mutationFn: (id: number) => categoriaService.remover(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias'] })
      toast.success('Categoria removida.')
      setConfirmarRemover(null)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao remover categoria.'),
  })

  const abrirCriar = () => {
    setForm({ ...VAZIO, ordem: categorias.length + 1 })
    setModal({ open: true })
  }

  const abrirEditar = (c: Categoria) => {
    setForm({ nome: c.nome, descricao: c.descricao ?? '', setor: c.setor, ativo: c.ativo, ordem: c.ordem })
    setModal({ open: true, categoria: c })
  }

  const fecharModal = () => {
    setModal({ open: false })
    setForm({ ...VAZIO })
  }

  const handleSubmit = () => {
    if (!form.nome) {
      toast.error('Informe o nome da categoria.')
      return
    }
    salvar(form)
  }

  if (isLoading) return <PageLoading />

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categorias</h1>
          <p className="text-sm text-gray-500 mt-0.5">{categorias.length} categoria{categorias.length !== 1 ? 's' : ''}</p>
        </div>
        {can(['gerente']) && (
          <button
            onClick={abrirCriar}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova Categoria
          </button>
        )}
      </div>

      {/* Lista */}
      {categorias.length === 0 ? (
        <EmptyState title="Nenhuma categoria cadastrada" />
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3 w-8"></th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Nome</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3 hidden md:table-cell">Descrição</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Preparo</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Ordem</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Status</th>
                {can(['gerente']) && (
                  <th className="text-right text-xs font-medium text-gray-500 px-5 py-3">Ações</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {categorias.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-gray-300">
                    <GripVertical className="w-4 h-4" />
                  </td>
                  <td className="px-5 py-3 font-medium text-gray-900">{c.nome}</td>
                  <td className="px-5 py-3 text-gray-500 hidden md:table-cell max-w-xs truncate">
                    {c.descricao || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={c.setor === 'bar' ? 'info' : 'orange'}>
                      {c.setor === 'bar' ? 'Bar' : 'Cozinha'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{c.ordem}</td>
                  <td className="px-5 py-3">
                    <Badge variant={c.ativo ? 'success' : 'default'}>
                      {c.ativo ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </td>
                  {can(['gerente']) && (
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => abrirEditar(c)}
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-brand-600 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Editar
                        </button>
                        <button
                          onClick={() => setConfirmarRemover(c)}
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <Modal
        open={modal.open}
        onClose={fecharModal}
        title={modal.categoria ? 'Editar Categoria' : 'Nova Categoria'}
        size="sm"
        footer={
          <>
            <button onClick={fecharModal} className="px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={salvando}
              className="px-4 py-2 text-sm text-white bg-brand-500 hover:bg-brand-600 rounded-lg disabled:opacity-50"
            >
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Nome *</label>
            <input
              type="text"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Descrição</label>
            <textarea
              rows={2}
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Preparado em</label>
            <select
              value={form.setor}
              onChange={(e) => setForm({ ...form, setor: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="cozinha">Cozinha (KDS da cozinha)</option>
              <option value="bar">Bar (KDS do bar)</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">Define em qual tela de preparo os itens desta categoria aparecem.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Ordem</label>
              <input
                type="number"
                min="1"
                value={form.ordem}
                onChange={(e) => setForm({ ...form, ordem: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                  className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                <span className="text-sm text-gray-700">Ativa</span>
              </label>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmarRemover}
        onClose={() => setConfirmarRemover(null)}
        onConfirm={() => confirmarRemover && remover(confirmarRemover.id)}
        loading={removendo}
        title="Remover categoria?"
        description={`"${confirmarRemover?.nome}" será removida. Produtos vinculados não serão afetados.`}
        confirmLabel="Remover"
      />
    </div>
  )
}

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Edit2, Trash2, Clock, ImageOff, ToggleLeft, ToggleRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { produtoService } from '@/services/produtoService'
import { categoriaService } from '@/services/categoriaService'
import { PageLoading } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Badge } from '@/components/ui/Badge'
import { useAuthStore } from '@/stores/authStore'
import type { Produto } from '@/types'

const VAZIO: Partial<Produto & { senha: string }> = {
  nome: '', descricao: '', preco: 0, disponivel: true, tempo_preparo: 10,
  controla_estoque: false, categoria: null,
}

export default function ProdutosPage() {
  const queryClient = useQueryClient()
  const can = useAuthStore((s) => s.can)
  const [busca, setBusca] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState<number | null>(null)
  const [modal, setModal] = useState<{ open: boolean; produto?: Produto }>({ open: false })
  const [confirmarRemover, setConfirmarRemover] = useState<Produto | null>(null)
  const [form, setForm] = useState<any>({ ...VAZIO })
  const [imagemFile, setImagemFile] = useState<File | null>(null)

  const { data: paginado, isLoading } = useQuery({
    queryKey: ['produtos', categoriaFiltro, busca],
    queryFn: () =>
      produtoService.listar({
        ...(categoriaFiltro ? { categoria_id: categoriaFiltro } : {}),
        ...(busca ? { search: busca } : {}),
        per_page: 100,
      }),
  })

  const { data: categorias = [] } = useQuery({
    queryKey: ['categorias'],
    queryFn: categoriaService.listar,
  })

  const produtos = paginado?.data ?? []

  const { mutate: salvar, isPending: salvando } = useMutation({
    mutationFn: (fd: FormData) =>
      modal.produto
        ? produtoService.atualizar(modal.produto.id, fd)
        : produtoService.criar(fd),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] })
      toast.success(modal.produto ? 'Produto atualizado.' : 'Produto criado.')
      fecharModal()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao salvar produto.'),
  })

  const { mutate: remover, isPending: removendo } = useMutation({
    mutationFn: (id: number) => produtoService.remover(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] })
      toast.success('Produto removido.')
      setConfirmarRemover(null)
    },
    onError: () => toast.error('Erro ao remover produto.'),
  })

  const { mutate: toggleDisponivel } = useMutation({
    mutationFn: ({ id, disponivel }: { id: number; disponivel: boolean }) => {
      const fd = new FormData()
      fd.append('disponivel', disponivel ? '1' : '0')
      fd.append('_method', 'PUT')
      return produtoService.atualizar(id, fd)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['produtos'] }),
    onError: () => toast.error('Erro ao atualizar disponibilidade.'),
  })

  const abrirCriar = () => {
    setForm({ ...VAZIO })
    setImagemFile(null)
    setModal({ open: true })
  }

  const abrirEditar = (p: Produto) => {
    setForm({
      nome: p.nome, descricao: p.descricao ?? '', preco: p.preco,
      disponivel: p.disponivel, tempo_preparo: p.tempo_preparo,
      controla_estoque: p.controla_estoque, categoria_id: p.categoria?.id,
    })
    setImagemFile(null)
    setModal({ open: true, produto: p })
  }

  const fecharModal = () => {
    setModal({ open: false })
    setForm({ ...VAZIO })
    setImagemFile(null)
  }

  const handleSubmit = () => {
    if (!form.nome || !form.preco || !form.categoria_id) {
      toast.error('Preencha nome, preço e categoria.')
      return
    }
    const fd = new FormData()
    fd.append('nome', form.nome)
    fd.append('descricao', form.descricao ?? '')
    fd.append('preco', String(form.preco))
    fd.append('disponivel', form.disponivel ? '1' : '0')
    fd.append('tempo_preparo', String(form.tempo_preparo))
    fd.append('controla_estoque', form.controla_estoque ? '1' : '0')
    fd.append('categoria_id', String(form.categoria_id))
    if (imagemFile) fd.append('imagem', imagemFile)
    if (modal.produto) fd.append('_method', 'PUT')
    salvar(fd)
  }

  if (isLoading) return <PageLoading />

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{produtos.length} produto{produtos.length !== 1 ? 's' : ''}</p>
        </div>
        {can(['gerente']) && (
          <button
            onClick={abrirCriar}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Produto
          </button>
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
        <select
          value={categoriaFiltro ?? ''}
          onChange={(e) => setCategoriaFiltro(e.target.value ? Number(e.target.value) : null)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Todas categorias</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.id}>{c.nome}</option>
          ))}
        </select>
      </div>

      {/* Grid */}
      {produtos.length === 0 ? (
        <EmptyState title="Nenhum produto encontrado" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {produtos.map((p) => (
            <div key={p.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden hover:border-gray-200 transition-colors">
              {p.imagem_url ? (
                <img src={p.imagem_url} alt={p.nome} className="w-full h-36 object-cover" />
              ) : (
                <div className="w-full h-36 bg-gray-50 flex items-center justify-center">
                  <ImageOff className="w-8 h-8 text-gray-300" />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{p.nome}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{p.categoria?.nome}</p>
                  </div>
                  <span className="text-sm font-bold text-brand-600 shrink-0">
                    R$ {p.preco.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <Badge variant={p.disponivel ? 'success' : 'default'}>
                    {p.disponivel ? 'Disponível' : 'Indisponível'}
                  </Badge>
                  <span className="flex items-center gap-0.5 text-xs text-gray-400 ml-auto">
                    <Clock className="w-3 h-3" />
                    {p.tempo_preparo}min
                  </span>
                </div>

                {can(['gerente']) && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                    <button
                      onClick={() => toggleDisponivel({ id: p.id, disponivel: !p.disponivel })}
                      className="text-gray-400 hover:text-brand-500 transition-colors"
                      title={p.disponivel ? 'Desativar' : 'Ativar'}
                    >
                      {p.disponivel
                        ? <ToggleRight className="w-5 h-5 text-green-500" />
                        : <ToggleLeft className="w-5 h-5" />
                      }
                    </button>
                    <button
                      onClick={() => abrirEditar(p)}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-brand-600 transition-colors ml-auto"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Editar
                    </button>
                    <button
                      onClick={() => setConfirmarRemover(p)}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal criar/editar */}
      <Modal
        open={modal.open}
        onClose={fecharModal}
        title={modal.produto ? 'Editar Produto' : 'Novo Produto'}
        size="md"
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
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Nome *</label>
              <input
                type="text"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Preço (R$) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.preco}
                onChange={(e) => setForm({ ...form, preco: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Categoria *</label>
              <select
                value={form.categoria_id ?? ''}
                onChange={(e) => setForm({ ...form, categoria_id: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Selecione...</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Tempo de preparo (min)</label>
              <input
                type="number"
                min="1"
                max="120"
                value={form.tempo_preparo}
                onChange={(e) => setForm({ ...form, tempo_preparo: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="flex items-center gap-3 pt-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.disponivel}
                  onChange={(e) => setForm({ ...form, disponivel: e.target.checked })}
                  className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                <span className="text-sm text-gray-700">Disponível</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.controla_estoque}
                  onChange={(e) => setForm({ ...form, controla_estoque: e.target.checked })}
                  className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                <span className="text-sm text-gray-700">Controla estoque</span>
              </label>
            </div>
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
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Imagem {modal.produto && '(deixe vazio para manter atual)'}
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImagemFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-brand-50 file:text-brand-600 hover:file:bg-brand-100"
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmarRemover}
        onClose={() => setConfirmarRemover(null)}
        onConfirm={() => confirmarRemover && remover(confirmarRemover.id)}
        loading={removendo}
        title="Remover produto?"
        description={`"${confirmarRemover?.nome}" será removido do cardápio.`}
        confirmLabel="Remover"
      />
    </div>
  )
}

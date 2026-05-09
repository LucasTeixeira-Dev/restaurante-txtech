import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, Trash2, Search, Shield } from 'lucide-react'
import toast from 'react-hot-toast'
import { usuarioService } from '@/services/usuarioService'
import { PageLoading } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Badge } from '@/components/ui/Badge'
import type { Usuario } from '@/types'

const PAPEIS = [
  { value: 'gerente', label: 'Gerente' },
  { value: 'garcom', label: 'Garçom' },
  { value: 'chapeiro', label: 'Chapeiro' },
  { value: 'caixa', label: 'Caixa' },
]

const PAPEL_COLORS: Record<string, string> = {
  gerente: 'bg-purple-50 text-purple-700 border-purple-200',
  garcom: 'bg-blue-50 text-blue-700 border-blue-200',
  chapeiro: 'bg-orange-50 text-orange-700 border-orange-200',
  caixa: 'bg-green-50 text-green-700 border-green-200',
}

const VAZIO = { nome: '', email: '', senha: '', papel: 'garcom', ativo: true }

export default function UsuariosPage() {
  const queryClient = useQueryClient()
  const [busca, setBusca] = useState('')
  const [modal, setModal] = useState<{ open: boolean; usuario?: Usuario }>({ open: false })
  const [confirmarRemover, setConfirmarRemover] = useState<Usuario | null>(null)
  const [form, setForm] = useState<any>({ ...VAZIO })

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: usuarioService.listar,
  })

  const filtrados = busca
    ? usuarios.filter(
        (u) =>
          u.nome.toLowerCase().includes(busca.toLowerCase()) ||
          u.email.toLowerCase().includes(busca.toLowerCase()),
      )
    : usuarios

  const { mutate: salvar, isPending: salvando } = useMutation({
    mutationFn: (data: any) =>
      modal.usuario
        ? usuarioService.atualizar(modal.usuario.id, data)
        : usuarioService.criar(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      toast.success(modal.usuario ? 'Usuário atualizado.' : 'Usuário criado.')
      fecharModal()
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao salvar usuário.'),
  })

  const { mutate: remover, isPending: removendo } = useMutation({
    mutationFn: (id: number) => usuarioService.remover(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] })
      toast.success('Usuário removido.')
      setConfirmarRemover(null)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao remover usuário.'),
  })

  const abrirCriar = () => {
    setForm({ ...VAZIO })
    setModal({ open: true })
  }

  const abrirEditar = (u: Usuario) => {
    setForm({ nome: u.nome, email: u.email, senha: '', papel: u.papel, ativo: u.ativo })
    setModal({ open: true, usuario: u })
  }

  const fecharModal = () => {
    setModal({ open: false })
    setForm({ ...VAZIO })
  }

  const handleSubmit = () => {
    if (!form.nome || !form.email) {
      toast.error('Preencha nome e e-mail.')
      return
    }
    if (!modal.usuario && !form.senha) {
      toast.error('Informe uma senha.')
      return
    }
    const payload: any = { nome: form.nome, email: form.email, papel: form.papel, ativo: form.ativo }
    if (form.senha) payload.senha = form.senha
    salvar(payload)
  }

  if (isLoading) return <PageLoading />

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="text-sm text-gray-500 mt-0.5">{usuarios.length} usuário{usuarios.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={abrirCriar}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Usuário
        </button>
      </div>

      {/* Busca */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nome ou e-mail..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <EmptyState title="Nenhum usuário encontrado" />
      ) : (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Nome</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3 hidden md:table-cell">E-mail</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Papel</th>
                <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Status</th>
                <th className="text-right text-xs font-medium text-gray-500 px-5 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtrados.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-brand-600">
                          {u.nome.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium text-gray-900">{u.nome}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-500 hidden md:table-cell">{u.email}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${PAPEL_COLORS[u.papel] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                      <Shield className="w-3 h-3" />
                      {PAPEIS.find((p) => p.value === u.papel)?.label ?? u.papel}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <Badge variant={u.ativo ? 'success' : 'default'}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => abrirEditar(u)}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-brand-600 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Editar
                      </button>
                      <button
                        onClick={() => setConfirmarRemover(u)}
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal criar/editar */}
      <Modal
        open={modal.open}
        onClose={fecharModal}
        title={modal.usuario ? 'Editar Usuário' : 'Novo Usuário'}
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
            <label className="block text-xs font-medium text-gray-700 mb-1.5">E-mail *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">
              Senha {modal.usuario && '(deixe em branco para manter)'}
            </label>
            <input
              type="password"
              value={form.senha}
              onChange={(e) => setForm({ ...form, senha: e.target.value })}
              placeholder={modal.usuario ? '••••••' : ''}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Papel *</label>
              <select
                value={form.papel}
                onChange={(e) => setForm({ ...form, papel: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {PAPEIS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
                  className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                <span className="text-sm text-gray-700">Ativo</span>
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
        title="Remover usuário?"
        description={`"${confirmarRemover?.nome}" será removido do sistema.`}
        confirmLabel="Remover"
      />
    </div>
  )
}

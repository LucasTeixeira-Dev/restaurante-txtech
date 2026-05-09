import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Users, QrCode, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { mesaService } from '@/services/mesaService'
import { useAuthStore } from '@/stores/authStore'
import { Badge, statusMesaBadge } from '@/components/ui/Badge'
import { PageLoading } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import type { Mesa } from '@/types'

const STATUS_ORDER: Mesa['status'][] = ['livre', 'ocupada', 'reservada']
const STATUS_COLORS: Record<Mesa['status'], string> = {
  livre: 'border-green-200 bg-green-50 hover:border-green-300',
  ocupada: 'border-red-200 bg-red-50 hover:border-red-300',
  reservada: 'border-yellow-200 bg-yellow-50 hover:border-yellow-300',
}

export default function MesasPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const can = useAuthStore((s) => s.can)
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [modalAbrir, setModalAbrir] = useState(false)
  const [novaCapacidade, setNovaCapacidade] = useState(4)

  const { data: mesas = [], isLoading, refetch } = useQuery({
    queryKey: ['mesas'],
    queryFn: () => mesaService.listar(),
    refetchInterval: 30_000,
  })

  const { mutate: criarMesa, isPending: criando } = useMutation({
    mutationFn: (numero: number) => mesaService.criar({ numero, capacidade: novaCapacidade }),
    onSuccess: () => {
      toast.success('Mesa criada com sucesso.')
      queryClient.invalidateQueries({ queryKey: ['mesas'] })
      setModalAbrir(false)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao criar mesa.'),
  })

  const { mutate: atualizarStatus } = useMutation({
    mutationFn: ({ id, status }: { id: number; status: Mesa['status'] }) =>
      mesaService.atualizarStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mesas'] })
    },
    onError: () => toast.error('Erro ao atualizar status da mesa.'),
  })

  const mesasFiltradas = filtroStatus === 'todos'
    ? mesas
    : mesas.filter((m) => m.status === filtroStatus)

  const proximoNumero = (mesas.length > 0 ? Math.max(...mesas.map((m) => m.numero)) : 0) + 1

  const stats = {
    total: mesas.length,
    livres: mesas.filter((m) => m.status === 'livre').length,
    ocupadas: mesas.filter((m) => m.status === 'ocupada').length,
    reservadas: mesas.filter((m) => m.status === 'reservada').length,
  }

  if (isLoading) return <PageLoading />

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mesas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {stats.total} mesas · {stats.livres} livres · {stats.ocupadas} ocupadas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Atualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {can(['gerente']) && (
            <button
              onClick={() => setModalAbrir(true)}
              className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nova Mesa
            </button>
          )}
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', valor: stats.total, cor: 'text-gray-700' },
          { label: 'Livres', valor: stats.livres, cor: 'text-green-600' },
          { label: 'Ocupadas', valor: stats.ocupadas, cor: 'text-red-600' },
          { label: 'Reservadas', valor: stats.reservadas, cor: 'text-yellow-600' },
        ].map(({ label, valor, cor }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`text-2xl font-bold mt-1 ${cor}`}>{valor}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {['todos', 'livre', 'ocupada', 'reservada'].map((s) => (
          <button
            key={s}
            onClick={() => setFiltroStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
              filtroStatus === s
                ? 'bg-brand-500 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s === 'todos' ? 'Todas' : s}
          </button>
        ))}
      </div>

      {/* Grid de mesas */}
      {mesasFiltradas.length === 0 ? (
        <EmptyState title="Nenhuma mesa encontrada" description="Tente outro filtro ou crie uma nova mesa." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {mesasFiltradas
            .sort((a, b) => a.numero - b.numero)
            .map((mesa) => {
              const { label, variant } = statusMesaBadge(mesa.status)
              return (
                <div
                  key={mesa.id}
                  className={`relative border-2 rounded-xl p-4 cursor-pointer transition-all ${STATUS_COLORS[mesa.status]}`}
                  onClick={() => {
                    if (mesa.status === 'ocupada' && mesa.pedido_ativo) {
                      navigate(`/pedidos/${mesa.pedido_ativo.id}`)
                    } else if (mesa.status === 'livre' && can(['gerente', 'garcom'])) {
                      navigate(`/pedidos/novo?mesa_id=${mesa.id}`)
                    }
                  }}
                >
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{mesa.numero}</p>
                    <div className="flex items-center justify-center gap-1 mt-1 text-gray-400">
                      <Users className="w-3 h-3" />
                      <span className="text-xs">{mesa.capacidade}</span>
                    </div>
                    <div className="mt-2">
                      <Badge variant={variant}>{label}</Badge>
                    </div>
                    {mesa.pedido_ativo && (
                      <p className="text-xs text-gray-500 mt-1.5 font-medium">
                        R$ {mesa.pedido_ativo.total.toFixed(2)}
                      </p>
                    )}
                  </div>

                  {/* Troca rápida de status — apenas gerente/garçom */}
                  {can(['gerente', 'garcom']) && (
                    <div className="absolute top-1.5 right-1.5">
                      <select
                        value={mesa.status}
                        onChange={(e) => {
                          e.stopPropagation()
                          atualizarStatus({ id: mesa.id, status: e.target.value as Mesa['status'] })
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs bg-white/70 border border-gray-200 rounded px-1 py-0.5 cursor-pointer"
                      >
                        {STATUS_ORDER.map((s) => (
                          <option key={s} value={s} className="capitalize">{s}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )
            })}
        </div>
      )}

      {/* Modal Nova Mesa */}
      <Modal
        open={modalAbrir}
        onClose={() => setModalAbrir(false)}
        title="Nova Mesa"
        size="sm"
        footer={
          <>
            <button
              onClick={() => setModalAbrir(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={() => criarMesa(proximoNumero)}
              disabled={criando}
              className="px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg disabled:opacity-50 transition-colors"
            >
              {criando ? 'Criando...' : 'Criar'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Número</label>
            <input
              type="number"
              value={proximoNumero}
              readOnly
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Capacidade</label>
            <input
              type="number"
              min={1}
              max={20}
              value={novaCapacidade}
              onChange={(e) => setNovaCapacidade(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}

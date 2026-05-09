import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Minus, Plus, ShoppingCart, Trash2, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { produtoService } from '@/services/produtoService'
import { mesaService } from '@/services/mesaService'
import { pedidoService } from '@/services/pedidoService'
import { PageLoading } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Produto } from '@/types'

interface ItemCarrinho {
  produto: Produto
  quantidade: number
  observacoes: string
}

export default function NovoPedidoPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()

  const mesaIdParam = searchParams.get('mesa_id')
  const [mesaId, setMesaId] = useState<number | undefined>(
    mesaIdParam ? Number(mesaIdParam) : undefined,
  )
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [categoriaAtiva, setCategoriaAtiva] = useState<number | null>(null)
  const [observacoesPedido, setObservacoesPedido] = useState('')
  const [busca, setBusca] = useState('')

  const { data: cardapio = [], isLoading: loadingCardapio } = useQuery({
    queryKey: ['cardapio'],
    queryFn: produtoService.cardapio,
  })

  const { data: mesas = [], isLoading: loadingMesas } = useQuery({
    queryKey: ['mesas', 'livres'],
    queryFn: () => mesaService.listar('livre'),
  })

  const { mutate: criarPedido, isPending: criando } = useMutation({
    mutationFn: pedidoService.criar,
    onSuccess: (pedido) => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
      queryClient.invalidateQueries({ queryKey: ['mesas'] })
      toast.success('Pedido criado com sucesso!')
      navigate(`/pedidos/${pedido.id}`)
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao criar pedido.'),
  })

  const adicionarItem = (produto: Produto) => {
    setCarrinho((prev) => {
      const idx = prev.findIndex((i) => i.produto.id === produto.id)
      if (idx >= 0) {
        return prev.map((i, j) =>
          j === idx ? { ...i, quantidade: i.quantidade + 1 } : i,
        )
      }
      return [...prev, { produto, quantidade: 1, observacoes: '' }]
    })
  }

  const alterarQuantidade = (produtoId: number, delta: number) => {
    setCarrinho((prev) =>
      prev
        .map((i) => i.produto.id === produtoId ? { ...i, quantidade: i.quantidade + delta } : i)
        .filter((i) => i.quantidade > 0),
    )
  }

  const removerItem = (produtoId: number) => {
    setCarrinho((prev) => prev.filter((i) => i.produto.id !== produtoId))
  }

  const totalCarrinho = carrinho.reduce((acc, i) => acc + i.produto.preco * i.quantidade, 0)

  const produtosFiltrados = (categoriaAtiva
    ? cardapio.find((c) => c.id === categoriaAtiva)?.produtos ?? []
    : cardapio.flatMap((c) => c.produtos)
  ).filter((p) => !busca || p.nome.toLowerCase().includes(busca.toLowerCase()))

  const confirmarPedido = () => {
    if (carrinho.length === 0) {
      toast.error('Adicione pelo menos um item ao pedido.')
      return
    }
    criarPedido({
      mesa_id: mesaId,
      observacoes: observacoesPedido || undefined,
      itens: carrinho.map((i) => ({
        produto_id: i.produto.id,
        quantidade: i.quantidade,
        observacoes: i.observacoes || undefined,
      })),
    })
  }

  if (loadingCardapio || loadingMesas) return <PageLoading />

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Novo Pedido</h1>
          <p className="text-xs text-gray-400">Selecione uma mesa e adicione itens</p>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Painel Esquerdo — cardápio */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mesa + Busca */}
          <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-3 shrink-0">
            <select
              value={mesaId ?? ''}
              onChange={(e) => setMesaId(e.target.value ? Number(e.target.value) : undefined)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Mesa — sem mesa (delivery)</option>
              {mesas.map((m) => (
                <option key={m.id} value={m.id}>
                  Mesa {m.numero} ({m.capacidade} lugares)
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Buscar produto..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Categorias */}
          <div className="bg-white border-b border-gray-100 px-6 py-2 flex gap-2 overflow-x-auto shrink-0">
            <button
              onClick={() => setCategoriaAtiva(null)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                categoriaAtiva === null
                  ? 'bg-brand-500 text-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              Todos
            </button>
            {cardapio.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoriaAtiva(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  categoriaAtiva === cat.id
                    ? 'bg-brand-500 text-white'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                {cat.nome}
              </button>
            ))}
          </div>

          {/* Grid de produtos */}
          <div className="flex-1 overflow-y-auto p-4">
            {produtosFiltrados.length === 0 ? (
              <EmptyState title="Nenhum produto encontrado" />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {produtosFiltrados.map((produto) => {
                  const noCarrinho = carrinho.find((i) => i.produto.id === produto.id)
                  return (
                    <button
                      key={produto.id}
                      onClick={() => adicionarItem(produto)}
                      className={`relative text-left bg-white border-2 rounded-xl p-3 transition-all hover:border-brand-200 hover:shadow-sm ${
                        noCarrinho ? 'border-brand-300 bg-brand-50' : 'border-gray-100'
                      }`}
                    >
                      {produto.imagem_url ? (
                        <img
                          src={produto.imagem_url}
                          alt={produto.nome}
                          className="w-full h-24 object-cover rounded-lg mb-2"
                        />
                      ) : (
                        <div className="w-full h-24 bg-gray-100 rounded-lg mb-2 flex items-center justify-center text-3xl">
                          🍔
                        </div>
                      )}
                      <p className="text-sm font-semibold text-gray-900 line-clamp-1">{produto.nome}</p>
                      <p className="text-xs text-brand-600 font-bold mt-0.5">
                        R$ {produto.preco.toFixed(2)}
                      </p>
                      <p className="flex items-center gap-0.5 text-xs text-gray-400 mt-0.5">
                        <Clock className="w-3 h-3" />
                        {produto.tempo_preparo}min
                      </p>
                      {noCarrinho && (
                        <span className="absolute top-2 right-2 w-5 h-5 bg-brand-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                          {noCarrinho.quantidade}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Painel Direito — carrinho */}
        <div className="w-80 bg-white border-l border-gray-100 flex flex-col shrink-0">
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-brand-500" />
              <h2 className="text-sm font-semibold text-gray-900">
                Carrinho ({carrinho.length} itens)
              </h2>
            </div>
          </div>

          {/* Itens */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {carrinho.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                Nenhum item adicionado ainda.
              </p>
            ) : (
              carrinho.map((item) => (
                <div key={item.produto.id} className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">
                      {item.produto.nome}
                    </p>
                    <p className="text-xs text-gray-500">
                      R$ {(item.produto.preco * item.quantidade).toFixed(2)}
                    </p>
                    <input
                      type="text"
                      value={item.observacoes}
                      onChange={(e) =>
                        setCarrinho((prev) =>
                          prev.map((i) =>
                            i.produto.id === item.produto.id
                              ? { ...i, observacoes: e.target.value }
                              : i,
                          ),
                        )
                      }
                      placeholder="Obs. (ex: sem cebola)"
                      className="mt-1 w-full text-xs border border-gray-100 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => alterarQuantidade(item.produto.id, -1)}
                      className="w-6 h-6 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">{item.quantidade}</span>
                    <button
                      onClick={() => alterarQuantidade(item.produto.id, 1)}
                      className="w-6 h-6 rounded-md bg-brand-100 hover:bg-brand-200 text-brand-600 flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removerItem(item.produto.id)}
                      className="w-6 h-6 rounded-md text-red-400 hover:bg-red-50 flex items-center justify-center transition-colors ml-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Rodapé do carrinho */}
          <div className="p-4 border-t border-gray-100 space-y-3">
            <textarea
              value={observacoesPedido}
              onChange={(e) => setObservacoesPedido(e.target.value)}
              placeholder="Observações do pedido..."
              rows={2}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Total</span>
              <span className="text-xl font-bold text-gray-900">
                R$ {totalCarrinho.toFixed(2)}
              </span>
            </div>
            <button
              onClick={confirmarPedido}
              disabled={criando || carrinho.length === 0}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-brand-300 text-white text-sm font-semibold py-3 rounded-xl transition-colors"
            >
              {criando ? 'Enviando...' : 'Confirmar Pedido'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

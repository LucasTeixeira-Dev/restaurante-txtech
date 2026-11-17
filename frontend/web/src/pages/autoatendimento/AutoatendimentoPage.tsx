import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ChefHat, ImageOff, Minus, Plus, Receipt, Settings, ShoppingCart, Trash2, X,
} from 'lucide-react'
import { autoatendimentoService, type ItemCarrinho } from '@/services/autoatendimentoService'
import { authService } from '@/services/authService'
import { produtoService } from '@/services/produtoService'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { useEchoChannel } from '@/hooks/useEcho'
import { Modal } from '@/components/ui/Modal'
import { Badge, statusItemBadge } from '@/components/ui/Badge'
import { PageLoading } from '@/components/ui/LoadingSpinner'
import ModoPagamento from '@/components/autoatendimento/ModoPagamento'
import ComprovanteConta, { brl } from '@/components/conta/ComprovanteConta'
import type { Produto } from '@/types'

interface LinhaCarrinho {
  produto: Produto
  quantidade: number
  observacoes: string
}

const erroApi = (e: any, padrao: string) => e?.response?.data?.message ?? padrao

/**
 * Tela do tablet da mesa (login de papel "mesa"):
 * - cardápio + carrinho (com os pedidos já feitos) + "Solicitar conta";
 * - modo pagamento (divisão, Pix, maquininha, caixa) depois de solicitar a conta;
 * - comprovante quando a conta é quitada; depois volta ao início para os próximos clientes.
 */
export default function AutoatendimentoPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const usuario = useAuthStore((s) => s.usuario)
  const logoutStore = useAuthStore((s) => s.logout)

  const [categoriaAtiva, setCategoriaAtiva] = useState<number | null>(null)
  const [carrinho, setCarrinho] = useState<LinhaCarrinho[]>([])
  const [aba, setAba] = useState<'carrinho' | 'pedidos'>('carrinho')
  const [painelAberto, setPainelAberto] = useState(false) // telas estreitas
  const [confirmarConta, setConfirmarConta] = useState(false)
  const [comprovanteVisto, setComprovanteVisto] = useState<number | null>(null)
  const [sair, setSair] = useState(false)
  const [senhaSair, setSenhaSair] = useState('')

  const { data: cardapio = [], isLoading: carregandoCardapio } = useQuery({
    queryKey: ['cardapio'],
    queryFn: produtoService.cardapio,
    refetchInterval: 5 * 60_000, // produto que ficou indisponível some sozinho
  })

  const { data: sessao, isLoading: carregandoSessao } = useQuery({
    queryKey: ['autoatendimento-sessao'],
    queryFn: autoatendimentoService.sessao,
    refetchInterval: 10_000,
  })

  useEffect(() => {
    if (cardapio.length > 0 && categoriaAtiva === null) setCategoriaAtiva(cardapio[0].id)
  }, [cardapio, categoriaAtiva])

  // Tempo real: andamento dos pedidos e da conta (pagamentos aprovados, conta quitada).
  const canal = `mesa.${sessao?.mesa.id ?? usuario?.mesa?.id ?? 0}`
  const recarregar = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['autoatendimento-sessao'] })
  }, [queryClient])
  useEchoChannel(canal, 'pedido.criado', recarregar)
  useEchoChannel(canal, 'pedido.status_atualizado', recarregar)
  useEchoChannel(canal, 'item.status_atualizado', recarregar)
  useEchoChannel(canal, 'conta.atualizada', recarregar)

  const conta = sessao?.conta ?? null
  const ultimaPaga = sessao?.ultima_conta_paga ?? null
  const mostrarComprovante = !conta && !!ultimaPaga && ultimaPaga.id !== comprovanteVisto

  // Comprovante some sozinho depois de 2 minutos (tablet pronto para os próximos clientes).
  useEffect(() => {
    if (!mostrarComprovante || !ultimaPaga) return
    const id = setTimeout(() => setComprovanteVisto(ultimaPaga.id), 120_000)
    return () => clearTimeout(id)
  }, [mostrarComprovante, ultimaPaga])

  const totalCarrinho = useMemo(
    () => carrinho.reduce((s, l) => s + l.produto.preco * l.quantidade, 0),
    [carrinho],
  )
  const qtdCarrinho = carrinho.reduce((s, l) => s + l.quantidade, 0)
  const produtos = cardapio.find((c) => c.id === categoriaAtiva)?.produtos ?? []
  const pedidosFeitos = (conta?.pedidos ?? []).filter((p) => p.status !== 'cancelado')
  const algoEmPreparo = pedidosFeitos.some((p) => p.status === 'aberto' || p.status === 'em_preparo')

  const adicionar = (produto: Produto) => {
    setCarrinho((atual) => {
      const linha = atual.find((l) => l.produto.id === produto.id)
      if (linha) {
        return atual.map((l) => (l.produto.id === produto.id ? { ...l, quantidade: l.quantidade + 1 } : l))
      }
      return [...atual, { produto, quantidade: 1, observacoes: '' }]
    })
    setAba('carrinho')
    toast.success(`${produto.nome} no carrinho`, { duration: 1200 })
  }

  const alterarQtd = (id: number, delta: number) =>
    setCarrinho((atual) =>
      atual
        .map((l) => (l.produto.id === id ? { ...l, quantidade: l.quantidade + delta } : l))
        .filter((l) => l.quantidade > 0),
    )

  const alterarObs = (id: number, observacoes: string) =>
    setCarrinho((atual) => atual.map((l) => (l.produto.id === id ? { ...l, observacoes } : l)))

  const { mutate: enviarPedido, isPending: enviando } = useMutation({
    mutationFn: () =>
      autoatendimentoService.fazerPedido(
        carrinho.map<ItemCarrinho>((l) => ({
          produto_id: l.produto.id,
          quantidade: l.quantidade,
          observacoes: l.observacoes.trim() || undefined,
        })),
      ),
    onSuccess: (pedido) => {
      setCarrinho([])
      setAba('pedidos')
      recarregar()
      toast.success(`Pedido #${pedido.id} enviado! Já estamos preparando.`, { duration: 4000 })
    },
    // Ex.: produto ficou indisponível ou sem estoque.
    onError: (e: any) => {
      toast.error(erroApi(e, 'Não foi possível enviar o pedido.'), { duration: 5000 })
      queryClient.invalidateQueries({ queryKey: ['cardapio'] })
    },
  })

  const { mutate: solicitarConta, isPending: solicitando } = useMutation({
    mutationFn: autoatendimentoService.pedirConta,
    onSuccess: () => {
      setConfirmarConta(false)
      setPainelAberto(false)
      recarregar()
    },
    onError: (e: any) => toast.error(erroApi(e, 'Não foi possível solicitar a conta.'), { duration: 6000 }),
  })

  // Sair do modo mesa exige a senha do tablet (o cliente não sai sozinho).
  const { mutate: confirmarSaida, isPending: saindo } = useMutation({
    mutationFn: async () => {
      // O login só confere a senha; revoga o token que ele cria e depois o da sessão atual.
      const { token } = await authService.login({ email: usuario?.email ?? '', senha: senhaSair })
      await api.post('/auth/logout', {}, { headers: { Authorization: `Bearer ${token}` } }).catch(() => undefined)
      await authService.logout().catch(() => undefined)
    },
    onSuccess: () => {
      logoutStore()
      navigate('/login', { replace: true })
    },
    onError: () => toast.error('Senha incorreta.'),
  })

  if (carregandoCardapio || carregandoSessao || !sessao) return <PageLoading />

  const mesaNumero = sessao.mesa.numero
  const botaoSair = (
    <button
      onClick={() => setSair(true)}
      className="fixed bottom-2 left-2 p-2 text-gray-300 hover:text-gray-400"
      aria-label="Configurações do tablet"
    >
      <Settings className="w-4 h-4" />
    </button>
  )
  const modalSair = (
    <Modal
      open={sair}
      onClose={() => { setSair(false); setSenhaSair('') }}
      title="Sair do modo mesa"
      size="sm"
      footer={
        <>
          <button
            onClick={() => { setSair(false); setSenhaSair('') }}
            className="px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg"
          >
            <X className="w-4 h-4 inline mr-1" />Cancelar
          </button>
          <button
            onClick={() => confirmarSaida()}
            disabled={saindo || senhaSair.length < 6}
            className="px-4 py-2 text-sm text-white bg-red-500 rounded-lg disabled:opacity-50"
          >
            {saindo ? 'Saindo...' : 'Sair'}
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-600 mb-3">Uso da equipe: digite a senha do tablet desta mesa.</p>
      <input
        type="password"
        value={senhaSair}
        onChange={(e) => setSenhaSair(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
        autoFocus
      />
    </Modal>
  )

  // Conta quitada: comprovante e agradecimento.
  if (mostrarComprovante && ultimaPaga) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center mb-3">
              <ChefHat className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Conta paga. Obrigado!</h1>
            <p className="text-sm text-gray-500 mt-1">Volte sempre.</p>
          </div>
          <ComprovanteConta conta={ultimaPaga} />
          <button
            onClick={() => setComprovanteVisto(ultimaPaga.id)}
            className="w-full mt-6 py-4 rounded-xl bg-brand-500 text-white font-bold"
          >
            Concluir
          </button>
        </div>
        {botaoSair}
        {modalSair}
      </div>
    )
  }

  // Conta solicitada: modo pagamento.
  if (conta?.status === 'fechamento_solicitado') {
    return (
      <div className="h-screen bg-gray-50 select-none">
        <ModoPagamento conta={conta} mesaNumero={mesaNumero} pixSimulado={sessao.pix_simulado} />
        {botaoSair}
        {modalSair}
      </div>
    )
  }

  const listaCarrinho = carrinho.length === 0 ? (
    <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 px-6 py-12">
      <ShoppingCart className="w-10 h-10 mb-3" />
      <p className="text-sm">Seu carrinho está vazio.</p>
      <p className="text-xs mt-1">Toque em um item do cardápio para adicionar.</p>
    </div>
  ) : (
    <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
      {carrinho.map((l) => (
        <div key={l.produto.id} className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">{l.produto.nome}</p>
              <p className="text-xs text-gray-500">{brl(l.produto.preco)} cada</p>
            </div>
            <p className="text-sm font-bold text-gray-900 shrink-0">{brl(l.produto.preco * l.quantidade)}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => alterarQtd(l.produto.id, -1)}
              className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 active:bg-gray-100"
              aria-label="Diminuir"
            >
              {l.quantidade === 1 ? <Trash2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
            </button>
            <span className="w-6 text-center font-semibold">{l.quantidade}</span>
            <button
              onClick={() => alterarQtd(l.produto.id, 1)}
              className="w-9 h-9 rounded-full bg-brand-500 text-white flex items-center justify-center active:bg-brand-600"
              aria-label="Aumentar"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <input
            type="text"
            maxLength={255}
            value={l.observacoes}
            onChange={(e) => alterarObs(l.produto.id, e.target.value)}
            placeholder="Alguma observação? (ex.: sem cebola)"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      ))}
    </div>
  )

  const listaPedidos = pedidosFeitos.length === 0 ? (
    <div className="flex-1 flex items-center justify-center text-sm text-gray-400 px-6 py-12 text-center">
      Você ainda não fez pedidos.
    </div>
  ) : (
    <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
      {pedidosFeitos.map((p) => (
        <div key={p.id} className="p-4 space-y-2">
          <p className="text-xs font-semibold text-gray-500">Pedido #{p.id}</p>
          {p.itens.filter((i) => i.status !== 'cancelado').map((i) => {
            const { label, variant } = statusItemBadge(i.status)
            return (
              <div key={i.id} className="flex items-center justify-between gap-2">
                <span className="text-sm text-gray-800 min-w-0">
                  <span className="font-semibold text-brand-600 mr-1">{i.quantidade}x</span>{i.produto?.nome}
                </span>
                <Badge variant={variant}>{label}</Badge>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )

  const painel = (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex border-b border-gray-100">
        {(['carrinho', 'pedidos'] as const).map((a) => (
          <button
            key={a}
            onClick={() => setAba(a)}
            className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
              aba === a ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500'
            }`}
          >
            {a === 'carrinho'
              ? `Carrinho${qtdCarrinho ? ` (${qtdCarrinho})` : ''}`
              : `Meus pedidos${pedidosFeitos.length ? ` (${pedidosFeitos.length})` : ''}`}
          </button>
        ))}
      </div>

      {aba === 'carrinho' ? listaCarrinho : listaPedidos}

      <div className="border-t border-gray-100 p-4 space-y-3">
        {aba === 'carrinho' ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total do carrinho</span>
              <span className="text-xl font-bold text-gray-900">{brl(totalCarrinho)}</span>
            </div>
            <button
              onClick={() => enviarPedido()}
              disabled={carrinho.length === 0 || enviando}
              className="w-full py-4 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:bg-gray-200 disabled:text-gray-400 text-white text-base font-bold transition-colors"
            >
              {enviando ? 'Enviando...' : 'Enviar pedido'}
            </button>
          </>
        ) : (
          conta && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Consumo até agora</span>
              <span className="text-xl font-bold text-gray-900">{brl(conta.subtotal)}</span>
            </div>
          )
        )}
      </div>
    </div>
  )

  return (
    <div className="h-screen flex flex-col bg-gray-50 select-none">
      {/* Topo */}
      <header className="flex items-center justify-between gap-3 px-4 md:px-6 py-3 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 bg-brand-500 rounded-xl flex items-center justify-center shrink-0">
            <ChefHat className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-bold text-gray-900 leading-tight">Mesa {mesaNumero}</p>
            <p className="text-xs text-gray-500 truncate">Escolha, peça e acompanhe por aqui</p>
          </div>
        </div>
        {conta && (
          <button
            onClick={() => setConfirmarConta(true)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-gray-900 text-white active:bg-gray-700"
          >
            <Receipt className="w-5 h-5" />
            <span>Solicitar conta · {brl(conta.subtotal)}</span>
          </button>
        )}
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Cardápio */}
        <main className="flex-1 flex flex-col min-w-0">
          <nav className="flex gap-2 overflow-x-auto px-4 md:px-6 py-3 bg-white border-b border-gray-100">
            {cardapio.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoriaAtiva(cat.id)}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                  categoriaAtiva === cat.id ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-700 active:bg-gray-200'
                }`}
              >
                {cat.nome}
              </button>
            ))}
          </nav>

          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            {produtos.length === 0 ? (
              <p className="text-center text-gray-400 py-16">Nenhum item disponível nesta categoria agora.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {produtos.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => adicionar(p)}
                    className="text-left bg-white rounded-2xl border border-gray-100 overflow-hidden active:scale-[0.99] transition-transform"
                  >
                    {p.imagem_url ? (
                      <img src={p.imagem_url} alt={p.nome} className="w-full h-40 object-cover" />
                    ) : (
                      <div className="w-full h-40 bg-gray-100 flex items-center justify-center">
                        <ImageOff className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                    <div className="p-4">
                      <p className="font-semibold text-gray-900">{p.nome}</p>
                      {p.descricao && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{p.descricao}</p>}
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-lg font-bold text-brand-600">{brl(p.preco)}</span>
                        <span className="w-10 h-10 rounded-full bg-brand-500 text-white flex items-center justify-center">
                          <Plus className="w-5 h-5" />
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Carrinho e pedidos (tablet deitado / telas largas) */}
        <aside className="hidden md:flex w-[360px] shrink-0 flex-col bg-white border-l border-gray-100">
          {painel}
        </aside>
      </div>

      {/* Telas estreitas: barra do carrinho */}
      <button
        onClick={() => setPainelAberto(true)}
        className="md:hidden m-4 py-4 rounded-xl bg-brand-500 text-white font-bold flex items-center justify-center gap-2"
      >
        <ShoppingCart className="w-5 h-5" />
        {qtdCarrinho > 0 ? `Ver carrinho (${qtdCarrinho}) · ${brl(totalCarrinho)}` : 'Carrinho e meus pedidos'}
      </button>

      <Modal open={painelAberto} onClose={() => setPainelAberto(false)} title="Seu pedido" size="md">
        <div className="-mx-6 -my-4 h-[70vh]">{painel}</div>
      </Modal>

      <Modal
        open={confirmarConta}
        onClose={() => setConfirmarConta(false)}
        title="Solicitar a conta?"
        size="sm"
        footer={
          <>
            <button
              onClick={() => setConfirmarConta(false)}
              className="px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg"
            >
              Ainda não
            </button>
            <button
              onClick={() => solicitarConta()}
              disabled={solicitando || algoEmPreparo}
              className="px-4 py-2 text-sm text-white bg-gray-900 rounded-lg disabled:opacity-50"
            >
              {solicitando ? 'Abrindo...' : 'Sim, ir para o pagamento'}
            </button>
          </>
        }
      >
        {algoEmPreparo ? (
          <p className="text-sm text-amber-700">
            Ainda estamos preparando seu pedido. A conta pode ser fechada assim que tudo estiver pronto.
          </p>
        ) : (
          <p className="text-sm text-gray-600">
            Você vai para a tela de pagamento{conta ? ` (consumo de ${brl(conta.subtotal)})` : ''}, onde pode dividir a conta
            e escolher Pix, maquininha ou pagar no caixa. Dá para voltar ao cardápio enquanto ninguém tiver pago.
          </p>
        )}
      </Modal>

      {botaoSair}
      {modalSair}
    </div>
  )
}

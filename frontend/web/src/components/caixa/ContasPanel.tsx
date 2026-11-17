import { useCallback, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { BellRing, CheckCircle2, CreditCard, Minus, Plus, Printer, Receipt, Store, X } from 'lucide-react'
import { contaService, FORMAS_PAGAMENTO, ROTULO_FORMA, ROTULO_METODO } from '@/services/contaService'
import { useEchoChannel } from '@/hooks/useEcho'
import { Modal } from '@/components/ui/Modal'
import { Badge, statusItemBadge } from '@/components/ui/Badge'
import { brl } from '@/components/conta/ComprovanteConta'
import type { Conta, FormaPagamento } from '@/types'

const erroApi = (e: any, padrao: string) => e?.response?.data?.message ?? padrao

interface Props {
  /** Sem caixa aberto não há como receber: o painel avisa e desabilita os botões. */
  caixaAberto: boolean
}

/** Contas em aberto: mesas em modo pagamento e pedidos de maquininha primeiro, em tempo real. */
export default function ContasPanel({ caixaAberto }: Props) {
  const queryClient = useQueryClient()
  const [contaId, setContaId] = useState<number | null>(null)

  const { data: contas = [] } = useQuery({
    queryKey: ['contas-em-aberto'],
    queryFn: contaService.emAberto,
    refetchInterval: 20_000,
  })

  const atualizar = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['contas-em-aberto'] })
    queryClient.invalidateQueries({ queryKey: ['conta'] })
    queryClient.invalidateQueries({ queryKey: ['caixa-atual'] })
  }, [queryClient])

  const aoMudarConta = useCallback(
    (d: any) => {
      atualizar()
      // Mesmo id do aviso do salão: gerente no caixa não vê o aviso duas vezes.
      if (d?.status === 'fechamento_solicitado' && d?.mesa) {
        toast(`Mesa ${d.mesa.numero} pediu a conta`, { id: `conta-${d.id}`, icon: '🧾', duration: 6000 })
      }
    },
    [atualizar],
  )
  const aoPedirPagamento = useCallback(
    (d: any) => {
      atualizar()
      const quem = d?.mesa ? `Mesa ${d.mesa.numero}` : `Conta #${d?.conta_id}`
      const parte = d?.pessoas > 1 && d?.parte ? ` · parte ${d.parte}/${d.pessoas}` : ''
      const texto = d?.metodo === 'maquininha'
        ? `${quem} pediu a maquininha${parte} · ${brl(d.valor)}`
        : `${quem} vai pagar no caixa${parte} · ${brl(d?.valor ?? 0)}`
      toast(texto, { id: `pg-${d?.id}`, icon: '💳', duration: 8000 })
    },
    [atualizar],
  )
  useEchoChannel('caixa', 'conta.atualizada', aoMudarConta)
  useEchoChannel('caixa', 'pagamento.solicitado', aoPedirPagamento)

  const emPagamento = contas.filter((c) => c.status === 'fechamento_solicitado').length

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-brand-500" />
          <h2 className="text-sm font-semibold text-gray-900">Contas em aberto</h2>
          {emPagamento > 0 && <Badge variant="danger">{emPagamento} em pagamento</Badge>}
        </div>
        {!caixaAberto && <span className="text-xs text-amber-600">Abra o caixa para receber</span>}
      </div>

      {contas.length === 0 ? (
        <p className="px-5 py-8 text-sm text-gray-400 text-center">Nenhuma conta em aberto.</p>
      ) : (
        <div className="divide-y divide-gray-50">
          {contas.map((c) => {
            const emPgto = c.status === 'fechamento_solicitado'
            const pendentes = (c.pagamentos ?? []).filter((p) => p.status === 'pendente' && p.metodo !== 'pix')
            return (
              <div key={c.id} className={`flex items-center justify-between gap-3 px-5 py-3 ${emPgto ? 'bg-red-50/60' : ''}`}>
                <div className="flex items-center gap-3 min-w-0">
                  {emPgto ? <BellRing className="w-5 h-5 text-red-500 shrink-0" /> : <Store className="w-5 h-5 text-gray-300 shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {c.mesa ? `Mesa ${c.mesa.numero}` : `Balcão · conta #${c.id}`}
                      {c.pessoas > 1 && <span className="font-normal text-gray-500"> · dividida em {c.pessoas}</span>}
                    </p>
                    <p className="text-xs text-gray-500">
                      {emPgto && c.solicitada_em
                        ? `Pediu a conta ${formatDistanceToNow(new Date(c.solicitada_em), { addSuffix: true, locale: ptBR })}`
                        : `Aberta ${formatDistanceToNow(new Date(c.aberta_em), { addSuffix: true, locale: ptBR })}`}
                      {c.total_pago > 0 && ` · pago ${brl(c.total_pago)}`}
                    </p>
                    {pendentes.map((p) => (
                      <p key={p.id} className="text-xs font-semibold text-amber-700 flex items-center gap-1 mt-0.5">
                        <CreditCard className="w-3 h-3" />
                        {ROTULO_METODO[p.metodo]}{p.parte && c.pessoas > 1 ? ` · parte ${p.parte}` : ''} · {brl(p.valor)}
                      </p>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-bold text-gray-900">{brl(c.total_pago > 0 ? c.restante : c.total)}</span>
                  <button
                    onClick={() => setContaId(c.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${
                      emPgto || pendentes.length ? 'bg-red-500 text-white hover:bg-red-600' : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {emPgto || pendentes.length ? 'Receber' : 'Ver'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {contaId !== null && <ContaModal contaId={contaId} caixaAberto={caixaAberto} onClose={() => setContaId(null)} />}
    </div>
  )
}

function ContaModal({ contaId, caixaAberto, onClose }: { contaId: number; caixaAberto: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [forma, setForma] = useState<FormaPagamento>('pix')
  const [alvo, setAlvo] = useState<string>('restante') // 'restante' | 'outro' | número da parte
  const [valorOutro, setValorOutro] = useState('')
  const [recebido, setRecebido] = useState('')

  const { data: conta } = useQuery({
    queryKey: ['conta', contaId],
    queryFn: () => contaService.buscar(contaId),
  })

  const aposMudar = (c: Conta) => {
    queryClient.setQueryData(['conta', contaId], c)
    queryClient.invalidateQueries({ queryKey: ['contas-em-aberto'] })
    queryClient.invalidateQueries({ queryKey: ['caixa-atual'] })
    queryClient.invalidateQueries({ queryKey: ['mesas'] })
  }

  const { mutate: dividir } = useMutation({
    mutationFn: (p: { pessoas?: number; cobrar_taxa_servico?: boolean }) => contaService.configurarDivisao(contaId, p),
    onSuccess: aposMudar,
    onError: (e: any) => toast.error(erroApi(e, 'Erro ao alterar a divisão.')),
  })

  const { mutate: confirmar } = useMutation({
    mutationFn: ({ id, f }: { id: number; f: FormaPagamento }) => contaService.confirmarPagamento(id, f),
    onSuccess: (c) => {
      aposMudar(c)
      toast.success(c.status === 'paga' ? 'Pagamento confirmado. Conta quitada!' : 'Pagamento confirmado.')
    },
    onError: (e: any) => toast.error(erroApi(e, 'Erro ao confirmar.')),
  })

  const { mutate: cancelarPendente } = useMutation({
    mutationFn: (id: number) => contaService.cancelarPagamento(id),
    onSuccess: aposMudar,
    onError: (e: any) => toast.error(erroApi(e, 'Erro ao cancelar.')),
  })

  const numero = (s: string) => Number(s.replace(',', '.')) || 0

  const { mutate: receber, isPending: recebendo } = useMutation({
    mutationFn: () =>
      contaService.pagar(contaId, {
        forma_pagamento: forma,
        parte: /^\d+$/.test(alvo) ? Number(alvo) : undefined,
        valor: alvo === 'outro' ? numero(valorOutro) : undefined,
        valor_recebido: forma === 'dinheiro' && recebido ? numero(recebido) : undefined,
      }),
    onSuccess: (c) => {
      aposMudar(c)
      const troco = c.pagamentos?.filter((p) => p.status === 'aprovado').at(-1)?.troco ?? 0
      toast.success(
        `${c.status === 'paga' ? 'Conta quitada.' : 'Pagamento registrado.'}${troco > 0 ? ` Troco: ${brl(troco)}` : ''}`,
        { duration: 6000 },
      )
      setRecebido('')
      setValorOutro('')
      setAlvo('restante')
    },
    onError: (e: any) => toast.error(erroApi(e, 'Erro ao registrar o pagamento.'), { duration: 6000 }),
  })

  if (!conta) {
    return (
      <Modal open onClose={onClose} title="Conta" size="lg">
        <p className="text-sm text-gray-400 py-6 text-center">Carregando...</p>
      </Modal>
    )
  }

  const paga = conta.status === 'paga'
  const travada = conta.total_pago > 0
  const emPreparo = (conta.pedidos ?? []).filter((p) => p.status === 'aberto' || p.status === 'em_preparo')
  const pendentes = (conta.pagamentos ?? []).filter((p) => p.status === 'pendente' && p.metodo !== 'pix')
  const valorAlvo = alvo === 'restante'
    ? conta.restante
    : alvo === 'outro'
      ? numero(valorOutro)
      : conta.partes.find((p) => String(p.parte) === alvo)?.valor ?? 0
  const troco = forma === 'dinheiro' && recebido ? numero(recebido) - valorAlvo : 0
  const podeReceber = !paga && caixaAberto && emPreparo.length === 0 && valorAlvo > 0
    && !(forma === 'dinheiro' && recebido !== '' && numero(recebido) < valorAlvo)

  return (
    <Modal
      open
      onClose={onClose}
      title={conta.mesa ? `Conta da Mesa ${conta.mesa.numero}` : `Conta #${conta.id} (balcão)`}
      size="lg"
      footer={
        paga ? (
          <>
            <Link
              to={`/contas/${conta.id}/comprovante`}
              target="_blank"
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <Printer className="w-4 h-4" /> Imprimir comprovante
            </Link>
            <button onClick={onClose} className="px-4 py-2 text-sm text-white bg-gray-900 rounded-lg">Fechar</button>
          </>
        ) : (
          <>
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">
              Voltar
            </button>
            <button
              onClick={() => receber()}
              disabled={!podeReceber || recebendo}
              className="px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg disabled:opacity-50"
            >
              {recebendo ? 'Registrando...' : `Receber ${brl(valorAlvo)}`}
            </button>
          </>
        )
      }
    >
      <div className="space-y-5">
        {/* Consumo */}
        <div className="border border-gray-100 rounded-xl divide-y divide-gray-50 max-h-48 overflow-y-auto">
          {(conta.pedidos ?? []).filter((p) => p.status !== 'cancelado').flatMap((p) =>
            p.itens.filter((i) => i.status !== 'cancelado').map((i) => {
              const { label, variant } = statusItemBadge(i.status)
              return (
                <div key={i.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                  <span className="text-gray-800 min-w-0">
                    <span className="font-semibold text-brand-600 mr-1">{i.quantidade}x</span>{i.produto?.nome}
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    {i.status !== 'pronto' && <Badge variant={variant}>{label}</Badge>}
                    <span className="font-medium w-20 text-right">{brl(i.subtotal)}</span>
                  </span>
                </div>
              )
            }),
          )}
        </div>

        {emPreparo.length > 0 && !paga && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            Pedido(s) {emPreparo.map((p) => `#${p.id}`).join(', ')} ainda em preparo. Receba quando tudo estiver pronto.
          </p>
        )}

        {/* Valores, taxa e divisão */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between text-gray-600"><span>Consumo</span><span>{brl(conta.subtotal)}</span></div>
          <label className="flex justify-between items-center text-gray-600">
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={conta.cobrar_taxa_servico}
                disabled={paga || travada}
                onChange={(e) => dividir({ cobrar_taxa_servico: e.target.checked })}
                className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              Taxa de serviço ({conta.taxa_servico_percentual}%)
            </span>
            <span>{brl(conta.taxa_servico)}</span>
          </label>
          <div className="flex justify-between text-base font-bold text-gray-900 pt-1.5 border-t border-gray-200">
            <span>Total</span><span>{brl(conta.total)}</span>
          </div>
          {conta.total_pago > 0 && (
            <div className="flex justify-between font-semibold">
              <span className="text-green-700">Pago {brl(conta.total_pago)}</span>
              {!paga && <span className="text-red-600">Falta {brl(conta.restante)}</span>}
            </div>
          )}
          {!paga && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-gray-600">Dividir em</span>
              <span className="flex items-center gap-2">
                <button
                  onClick={() => dividir({ pessoas: conta.pessoas - 1 })}
                  disabled={travada || conta.pessoas <= 1}
                  className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center disabled:opacity-40"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-6 text-center font-semibold">{conta.pessoas}</span>
                <button
                  onClick={() => dividir({ pessoas: conta.pessoas + 1 })}
                  disabled={travada || conta.pessoas >= 20}
                  className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <span className="text-gray-500">pessoa(s)</span>
              </span>
            </div>
          )}
        </div>

        {/* Partes */}
        {conta.pessoas > 1 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {conta.partes.map((p) => (
              <div
                key={p.parte}
                className={`rounded-lg border px-3 py-2 text-sm ${p.status === 'paga' ? 'bg-green-50 border-green-200' : 'border-gray-200'}`}
              >
                <p className="text-xs text-gray-500">Parte {p.parte}</p>
                <p className="font-semibold">{brl(p.valor)}</p>
                <p className="text-xs">
                  {p.status === 'paga' ? (
                    <span className="text-green-700 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{ROTULO_FORMA[p.forma ?? '']}</span>
                  ) : p.status === 'aguardando' ? (
                    <span className="text-amber-700">Aguardando {p.metodo ? ROTULO_METODO[p.metodo] : ''}</span>
                  ) : (
                    <span className="text-gray-400">Em aberto</span>
                  )}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Maquininha / caixa pedidos pelo tablet */}
        {pendentes.length > 0 && !paga && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-700">Pedidos da mesa</p>
            {pendentes.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 border border-amber-200 bg-amber-50 rounded-lg px-3 py-2">
                <span className="text-sm text-amber-800">
                  {ROTULO_METODO[p.metodo]}{p.parte && conta.pessoas > 1 ? ` · parte ${p.parte}` : ''} · <b>{brl(p.valor)}</b>
                </span>
                <span className="flex items-center gap-1.5">
                  {(p.metodo === 'maquininha' ? ['debito', 'credito'] : ['dinheiro', 'debito', 'credito', 'pix']).map((f) => (
                    <button
                      key={f}
                      onClick={() => confirmar({ id: p.id, f: f as FormaPagamento })}
                      disabled={!caixaAberto}
                      className="px-2.5 py-1 text-xs font-semibold rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      {ROTULO_FORMA[f]}
                    </button>
                  ))}
                  <button
                    onClick={() => cancelarPendente(p.id)}
                    className="p-1 text-gray-400 hover:text-red-500"
                    title="Cancelar pedido de pagamento"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Registrar recebimento no caixa */}
        {!paga && (
          <div className="space-y-3 border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-700">Receber no caixa</p>
            <div className="flex flex-wrap gap-2">
              <EscolhaAlvo ativo={alvo === 'restante'} onClick={() => setAlvo('restante')}>Tudo que falta</EscolhaAlvo>
              {conta.pessoas > 1 && conta.partes.filter((p) => p.status !== 'paga').map((p) => (
                <EscolhaAlvo key={p.parte} ativo={alvo === String(p.parte)} onClick={() => setAlvo(String(p.parte))}>
                  Parte {p.parte}
                </EscolhaAlvo>
              ))}
              <EscolhaAlvo ativo={alvo === 'outro'} onClick={() => setAlvo('outro')}>Outro valor</EscolhaAlvo>
            </div>
            {alvo === 'outro' && (
              <input
                type="text"
                inputMode="decimal"
                value={valorOutro}
                onChange={(e) => setValorOutro(e.target.value)}
                placeholder="Valor (R$)"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            )}
            <div className="grid grid-cols-4 gap-2">
              {FORMAS_PAGAMENTO.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setForma(f.value)}
                  className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                    forma === f.value ? 'bg-brand-500 text-white border-brand-500' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {forma === 'dinheiro' && (
              <div>
                <input
                  type="text"
                  inputMode="decimal"
                  value={recebido}
                  onChange={(e) => setRecebido(e.target.value)}
                  placeholder={`Valor recebido (ex.: ${valorAlvo.toFixed(2).replace('.', ',')})`}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
                {troco > 0 && <p className="text-sm font-semibold text-green-700 mt-1">Troco: {brl(troco)}</p>}
                {recebido !== '' && troco < 0 && <p className="text-xs text-red-500 mt-1">Valor menor que o cobrado.</p>}
              </div>
            )}
            {!caixaAberto && <p className="text-sm text-amber-700">Abra o caixa para poder receber.</p>}
          </div>
        )}
      </div>
    </Modal>
  )
}

function EscolhaAlvo({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
        ativo ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  )
}

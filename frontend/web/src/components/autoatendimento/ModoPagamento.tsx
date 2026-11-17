import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { QRCodeSVG } from 'qrcode.react'
import toast from 'react-hot-toast'
import {
  ArrowLeft, CheckCircle2, Copy, CreditCard, Loader2, Minus, Plus, QrCode, Store, Users,
} from 'lucide-react'
import { autoatendimentoService } from '@/services/autoatendimentoService'
import { ROTULO_FORMA } from '@/services/contaService'
import { brl } from '@/components/conta/ComprovanteConta'
import { Modal } from '@/components/ui/Modal'
import type { Conta, MetodoPagamento, Pagamento, ParteConta } from '@/types'

const erroApi = (e: any, padrao: string) => e?.response?.data?.message ?? padrao

interface Props {
  conta: Conta
  mesaNumero: number
  pixSimulado: boolean
}

/**
 * Modo pagamento do tablet: total com taxa (o cliente pode tirar), divisão em N pessoas
 * e, para cada parte, Pix na tela, maquininha (a equipe traz) ou pagar no caixa.
 * A mesa só é liberada quando todas as partes estão pagas.
 */
export default function ModoPagamento({ conta, mesaNumero, pixSimulado }: Props) {
  const queryClient = useQueryClient()
  const [pix, setPix] = useState<Pagamento | null>(null)
  const travada = conta.total_pago > 0 // depois do 1º pagamento, divisão e taxa não mudam
  const recarregar = () => queryClient.invalidateQueries({ queryKey: ['autoatendimento-sessao'] })

  const { mutate: dividir, isPending: dividindo } = useMutation({
    mutationFn: autoatendimentoService.configurarDivisao,
    onSuccess: recarregar,
    onError: (e: any) => toast.error(erroApi(e, 'Não foi possível alterar a divisão.')),
  })

  const { mutate: voltar, isPending: voltando } = useMutation({
    mutationFn: autoatendimentoService.voltarAoCardapio,
    onSuccess: recarregar,
    onError: (e: any) => toast.error(erroApi(e, 'Não foi possível voltar ao cardápio.')),
  })

  const { mutate: pagar, isPending: iniciando, variables } = useMutation({
    mutationFn: ({ parte, metodo }: { parte: number; metodo: MetodoPagamento }) =>
      autoatendimentoService.pagar(parte, metodo),
    onSuccess: (pagamento) => {
      recarregar()
      if (pagamento.metodo === 'pix') setPix(pagamento)
      if (pagamento.metodo === 'maquininha') toast.success('Pronto! Um atendente está trazendo a maquininha.', { duration: 5000 })
      if (pagamento.metodo === 'caixa') toast.success(`Combinado! Informe no caixa: Mesa ${mesaNumero}.`, { duration: 5000 })
    },
    onError: (e: any) => toast.error(erroApi(e, 'Não foi possível iniciar o pagamento.')),
  })

  // Fecha o QR assim que a parte dele for paga (aviso em tempo real ou polling).
  useEffect(() => {
    if (!pix) return
    const parte = conta.partes.find((p) => p.parte === pix.parte)
    if (parte?.status === 'paga') {
      setPix(null)
      toast.success('Pix recebido. Obrigado!')
    }
  }, [conta, pix])

  const pendenteDa = (p: ParteConta) =>
    conta.pagamentos?.find((x) => x.parte === p.parte && x.status === 'pendente')

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fechar a conta</h1>
            <p className="text-sm text-gray-500">Mesa {mesaNumero}</p>
          </div>
          {!travada && (
            <button
              onClick={() => voltar()}
              disabled={voltando}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 active:bg-gray-100"
            >
              <ArrowLeft className="w-4 h-4" /> Voltar ao cardápio
            </button>
          )}
        </div>

        {/* Valores */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-2">
          <div className="flex justify-between text-gray-600"><span>Consumo</span><span>{brl(conta.subtotal)}</span></div>
          <label className={`flex items-center justify-between gap-3 text-gray-600 ${travada ? '' : 'cursor-pointer'}`}>
            <span className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={conta.cobrar_taxa_servico}
                disabled={travada || dividindo}
                onChange={(e) => dividir({ cobrar_taxa_servico: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              Taxa de serviço ({conta.taxa_servico_percentual}%, opcional)
            </span>
            <span>{brl(conta.taxa_servico)}</span>
          </label>
          <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-100">
            <span>Total</span><span>{brl(conta.total)}</span>
          </div>
          {conta.total_pago > 0 && (
            <div className="flex justify-between text-sm font-semibold text-green-700">
              <span>Já pago {brl(conta.total_pago)}</span><span>Falta {brl(conta.restante)}</span>
            </div>
          )}
        </div>

        {/* Divisão */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-brand-500" />
            <div>
              <p className="font-semibold text-gray-900">Dividir a conta</p>
              <p className="text-xs text-gray-500">
                {travada ? 'A divisão não muda depois do primeiro pagamento.' : 'Em partes iguais, cada um paga como preferir.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => dividir({ pessoas: conta.pessoas - 1 })}
              disabled={travada || dividindo || conta.pessoas <= 1}
              className="w-11 h-11 rounded-full border border-gray-200 flex items-center justify-center disabled:opacity-40"
              aria-label="Menos pessoas"
            >
              <Minus className="w-5 h-5" />
            </button>
            <span className="text-2xl font-bold w-8 text-center">{conta.pessoas}</span>
            <button
              onClick={() => dividir({ pessoas: conta.pessoas + 1 })}
              disabled={travada || dividindo || conta.pessoas >= 20}
              className="w-11 h-11 rounded-full bg-brand-500 text-white flex items-center justify-center disabled:opacity-40"
              aria-label="Mais pessoas"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Partes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {conta.partes.map((p) => {
            const pendente = pendenteDa(p)
            const carregando = iniciando && variables?.parte === p.parte
            return (
              <div
                key={p.parte}
                className={`rounded-2xl border p-5 space-y-4 ${
                  p.status === 'paga' ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-700">
                    {conta.pessoas > 1 ? `Pessoa ${p.parte}` : 'Valor a pagar'}
                  </p>
                  <p className="text-xl font-bold text-gray-900">{brl(p.valor)}</p>
                </div>

                {p.status === 'paga' ? (
                  <p className="flex items-center gap-2 text-green-700 font-semibold">
                    <CheckCircle2 className="w-5 h-5" /> Paga{p.forma ? ` · ${ROTULO_FORMA[p.forma]}` : ''}
                  </p>
                ) : (
                  <>
                    {pendente?.metodo === 'maquininha' && (
                      <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                        Um atendente está trazendo a maquininha.
                      </p>
                    )}
                    {pendente?.metodo === 'caixa' && (
                      <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                        Pague no caixa informando Mesa {mesaNumero}{conta.pessoas > 1 ? `, pessoa ${p.parte}` : ''}.
                      </p>
                    )}
                    <div className="grid grid-cols-3 gap-2">
                      <BotaoMetodo
                        icone={<QrCode className="w-5 h-5" />}
                        rotulo="Pix"
                        ativo={pendente?.metodo === 'pix'}
                        carregando={carregando && variables?.metodo === 'pix'}
                        onClick={() => pagar({ parte: p.parte, metodo: 'pix' })}
                      />
                      <BotaoMetodo
                        icone={<CreditCard className="w-5 h-5" />}
                        rotulo="Maquininha"
                        ativo={pendente?.metodo === 'maquininha'}
                        carregando={carregando && variables?.metodo === 'maquininha'}
                        onClick={() => pagar({ parte: p.parte, metodo: 'maquininha' })}
                      />
                      <BotaoMetodo
                        icone={<Store className="w-5 h-5" />}
                        rotulo="No caixa"
                        ativo={pendente?.metodo === 'caixa'}
                        carregando={carregando && variables?.metodo === 'caixa'}
                        onClick={() => pagar({ parte: p.parte, metodo: 'caixa' })}
                      />
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-center text-xs text-gray-400">
          A mesa é liberada quando todas as partes estiverem pagas. Cartão por aproximação: use a maquininha.
        </p>
      </div>

      {pix && <PixModal pagamento={pix} pixSimulado={pixSimulado} onClose={() => setPix(null)} />}
    </div>
  )
}

function BotaoMetodo({ icone, rotulo, ativo, carregando, onClick }: {
  icone: React.ReactNode; rotulo: string; ativo: boolean; carregando: boolean; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={carregando}
      className={`flex flex-col items-center gap-1 py-3 rounded-xl text-sm font-semibold border transition-colors ${
        ativo ? 'bg-brand-500 border-brand-500 text-white' : 'bg-white border-gray-200 text-gray-700 active:bg-gray-100'
      }`}
    >
      {carregando ? <Loader2 className="w-5 h-5 animate-spin" /> : icone}
      {rotulo}
    </button>
  )
}

function PixModal({ pagamento, pixSimulado, onClose }: { pagamento: Pagamento; pixSimulado: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [agora, setAgora] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // Enquanto o QR está na tela, confere a conta com mais frequência (o aviso em tempo real também chega).
  useEffect(() => {
    const id = setInterval(() => queryClient.invalidateQueries({ queryKey: ['autoatendimento-sessao'] }), 5000)
    return () => clearInterval(id)
  }, [queryClient])

  const { mutate: simular, isPending: simulando } = useMutation({
    mutationFn: () => autoatendimentoService.simularPix(pagamento.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['autoatendimento-sessao'] }),
    onError: (e: any) => toast.error(erroApi(e, 'Não foi possível simular.')),
  })

  const segundos = pagamento.expira_em
    ? Math.max(0, Math.floor((new Date(pagamento.expira_em).getTime() - agora) / 1000))
    : null
  const expirou = segundos === 0
  const codigo = pagamento.pix_copia_e_cola ?? ''

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(codigo)
      toast.success('Código Pix copiado.')
    } catch {
      toast.error('Não foi possível copiar.')
    }
  }

  return (
    <Modal open onClose={onClose} title={`Pix · ${brl(pagamento.valor)}`} size="md">
      <div className="flex flex-col items-center text-center gap-4">
        {expirou ? (
          <p className="text-sm text-red-600 py-8">Este QR Code expirou. Feche e toque em Pix de novo para gerar outro.</p>
        ) : (
          <>
            <p className="text-sm text-gray-600">Abra o app do seu banco, escolha Pix e aponte a câmera para o código.</p>
            <div className="p-3 bg-white rounded-xl border border-gray-100">
              <QRCodeSVG value={codigo} size={240} />
            </div>
            <button
              onClick={copiar}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700"
            >
              <Copy className="w-4 h-4" /> Copiar código Pix
            </button>
            <p className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Aguardando o pagamento
              {segundos !== null && ` · expira em ${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`}
            </p>
            {pixSimulado && (
              <button
                onClick={() => simular()}
                disabled={simulando}
                className="text-xs text-gray-400 underline"
              >
                {simulando ? 'Simulando...' : 'Simular pagamento (ambiente de desenvolvimento)'}
              </button>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Lock, Unlock, ChevronRight } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { caixaService } from '@/services/caixaService'
import { FORMAS_PAGAMENTO } from '@/services/contaService'
import ContasPanel from '@/components/caixa/ContasPanel'
import { PageLoading } from '@/components/ui/LoadingSpinner'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { useAuthStore } from '@/stores/authStore'
import type { Caixa } from '@/types'

export default function CaixaPage() {
  const queryClient = useQueryClient()
  const can = useAuthStore((s) => s.can)
  const [modalAbrir, setModalAbrir] = useState(false)
  const [modalFechar, setModalFechar] = useState(false)
  const [saldoInicial, setSaldoInicial] = useState('')
  const [saldoFinal, setSaldoFinal] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [detalhe, setDetalhe] = useState<Caixa | null>(null)

  const { data: caixaAtual, isLoading: loadingAtual } = useQuery({
    queryKey: ['caixa-atual'],
    queryFn: caixaService.atual,
    refetchInterval: 30_000,
  })

  const { data: historico = [], isLoading: loadingHistorico } = useQuery({
    queryKey: ['caixas'],
    queryFn: caixaService.listar,
  })

  const { mutate: abrir, isPending: abrindo } = useMutation({
    mutationFn: () => caixaService.abrir(Number(saldoInicial) || 0),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caixa-atual'] })
      queryClient.invalidateQueries({ queryKey: ['caixas'] })
      toast.success('Caixa aberto com sucesso.')
      setModalAbrir(false)
      setSaldoInicial('')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao abrir caixa.'),
  })

  const { mutate: fechar, isPending: fechando } = useMutation({
    mutationFn: () => caixaService.fechar(Number(saldoFinal) || 0, observacoes || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['caixa-atual'] })
      queryClient.invalidateQueries({ queryKey: ['caixas'] })
      toast.success('Caixa fechado com sucesso.')
      setModalFechar(false)
      setSaldoFinal('')
      setObservacoes('')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao fechar caixa.'),
  })

  if (loadingAtual || loadingHistorico) return <PageLoading />

  const caixaAberto = !!caixaAtual

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Caixa</h1>
          <p className="text-sm text-gray-500 mt-0.5">Controle de abertura e fechamento</p>
        </div>
        {can(['gerente', 'caixa']) && (
          caixaAberto ? (
            <button
              onClick={() => setModalFechar(true)}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Lock className="w-4 h-4" />
              Fechar Caixa
            </button>
          ) : (
            <button
              onClick={() => setModalAbrir(true)}
              className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Unlock className="w-4 h-4" />
              Abrir Caixa
            </button>
          )
        )}
      </div>

      {/* Status atual */}
      <div className={`rounded-2xl p-6 border-2 ${caixaAberto ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
        {caixaAberto ? (
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-semibold text-green-700">Caixa Aberto</span>
              </div>
              <p className="text-xs text-gray-500">
                Aberto por <span className="font-medium text-gray-700">{caixaAtual.usuario?.nome ?? '—'}</span>
                {' '}em{' '}
                {format(parseISO(caixaAtual.aberto_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
            <div className="flex gap-6">
              <div className="text-right">
                <p className="text-xs text-gray-500">Saldo inicial</p>
                <p className="text-xl font-bold text-gray-900">
                  R$ {Number(caixaAtual.saldo_inicial).toFixed(2)}
                </p>
              </div>
              {caixaAtual.total_vendas != null && (
                <div className="text-right">
                  <p className="text-xs text-gray-500">
                    Recebido no caixa{caixaAtual.contas_pagas ? ` · ${caixaAtual.contas_pagas} conta(s)` : ''}
                  </p>
                  <p className="text-xl font-bold text-green-700">
                    R$ {Number(caixaAtual.total_vendas).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
            {caixaAtual.por_forma_pagamento && Object.keys(caixaAtual.por_forma_pagamento).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {FORMAS_PAGAMENTO.filter((f) => caixaAtual.por_forma_pagamento?.[f.value]).map((f) => (
                  <span key={f.value} className="text-xs bg-white border border-green-100 rounded-lg px-2.5 py-1 text-gray-700">
                    {f.label}: <span className="font-semibold">R$ {Number(caixaAtual.por_forma_pagamento?.[f.value]).toFixed(2)}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Lock className="w-8 h-8 text-gray-400" />
            <div>
              <p className="text-sm font-semibold text-gray-700">Caixa Fechado</p>
              <p className="text-xs text-gray-400">Abra o caixa para registrar vendas.</p>
            </div>
          </div>
        )}
      </div>

      {/* Contas das mesas e do balcão */}
      <ContasPanel caixaAberto={caixaAberto} />

      {/* Histórico */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Histórico de caixas</h2>
        {historico.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum registro ainda.</p>
        ) : (
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Aberto em</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-5 py-3 hidden md:table-cell">Fechado em</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-5 py-3 hidden md:table-cell">Operador</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-5 py-3">Saldo inicial</th>
                  <th className="text-right text-xs font-medium text-gray-500 px-5 py-3">Total vendas</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-5 py-3">Status</th>
                  <th className="px-5 py-3 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {historico.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 text-gray-700">
                      {format(parseISO(c.aberto_em), 'dd/MM/yyyy HH:mm')}
                    </td>
                    <td className="px-5 py-3 text-gray-500 hidden md:table-cell">
                      {c.fechado_em
                        ? format(parseISO(c.fechado_em), 'dd/MM/yyyy HH:mm')
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3 text-gray-500 hidden md:table-cell">
                      {c.usuario?.nome ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-gray-700">
                      R$ {Number(c.saldo_inicial).toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-gray-900">
                      {c.total_vendas != null
                        ? `R$ ${Number(c.total_vendas).toFixed(2)}`
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      <Badge variant={c.fechado_em ? 'default' : 'success'}>
                        {c.fechado_em ? 'Fechado' : 'Aberto'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => setDetalhe(c)}
                        className="text-gray-400 hover:text-brand-500 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal abrir caixa */}
      <Modal
        open={modalAbrir}
        onClose={() => setModalAbrir(false)}
        title="Abrir Caixa"
        size="sm"
        footer={
          <>
            <button onClick={() => setModalAbrir(false)} className="px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
            <button
              onClick={() => abrir()}
              disabled={abrindo}
              className="px-4 py-2 text-sm text-white bg-brand-500 hover:bg-brand-600 rounded-lg disabled:opacity-50"
            >
              {abrindo ? 'Abrindo...' : 'Abrir Caixa'}
            </button>
          </>
        }
      >
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1.5">
            Saldo inicial (R$)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="0,00"
            value={saldoInicial}
            onChange={(e) => setSaldoInicial(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <p className="text-xs text-gray-400 mt-1.5">Informe o valor em caixa no momento da abertura.</p>
        </div>
      </Modal>

      {/* Modal fechar caixa */}
      <Modal
        open={modalFechar}
        onClose={() => setModalFechar(false)}
        title="Fechar Caixa"
        size="sm"
        footer={
          <>
            <button onClick={() => setModalFechar(false)} className="px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">
              Cancelar
            </button>
            <button
              onClick={() => fechar()}
              disabled={fechando}
              className="px-4 py-2 text-sm text-white bg-red-500 hover:bg-red-600 rounded-lg disabled:opacity-50"
            >
              {fechando ? 'Fechando...' : 'Confirmar Fechamento'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          {caixaAtual && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Saldo inicial</span>
                <span className="font-medium">R$ {Number(caixaAtual.saldo_inicial).toFixed(2)}</span>
              </div>
              {caixaAtual.total_vendas != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total vendas</span>
                  <span className="font-semibold text-green-600">R$ {Number(caixaAtual.total_vendas).toFixed(2)}</span>
                </div>
              )}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Saldo final em caixa (R$) *</label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={saldoFinal}
              onChange={(e) => setSaldoFinal(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Observações</label>
            <textarea
              rows={2}
              placeholder="Opcional..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>
      </Modal>

      {/* Modal detalhe */}
      <Modal
        open={!!detalhe}
        onClose={() => setDetalhe(null)}
        title="Detalhes do Caixa"
        size="sm"
      >
        {detalhe && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Operador</span>
              <span className="font-medium">{detalhe.usuario?.nome ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Aberto em</span>
              <span>{format(parseISO(detalhe.aberto_em), "dd/MM/yyyy 'às' HH:mm")}</span>
            </div>
            {detalhe.fechado_em && (
              <div className="flex justify-between">
                <span className="text-gray-500">Fechado em</span>
                <span>{format(parseISO(detalhe.fechado_em), "dd/MM/yyyy 'às' HH:mm")}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Saldo inicial</span>
              <span className="font-medium">R$ {Number(detalhe.saldo_inicial).toFixed(2)}</span>
            </div>
            {detalhe.total_vendas != null && (
              <div className="flex justify-between">
                <span className="text-gray-500">Total vendas</span>
                <span className="font-semibold text-green-600">R$ {Number(detalhe.total_vendas).toFixed(2)}</span>
              </div>
            )}
            {detalhe.observacoes && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-1">Observações</p>
                <p className="text-gray-700">{detalhe.observacoes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

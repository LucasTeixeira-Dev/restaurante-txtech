import { api } from '@/lib/api'
import type { Conta, FormaPagamento, MetodoPagamento } from '@/types'

export interface RegistroPagamento {
  forma_pagamento: FormaPagamento
  /** Uma parte da divisão; sem parte nem valor = recebe todo o restante. */
  parte?: number
  /** Valor avulso (fora das partes). */
  valor?: number
  /** Só dinheiro: o troco é calculado pela API. */
  valor_recebido?: number
}

export const FORMAS_PAGAMENTO: { value: FormaPagamento; label: string }[] = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'debito', label: 'Débito' },
  { value: 'credito', label: 'Crédito' },
  { value: 'pix', label: 'Pix' },
]

export const ROTULO_FORMA: Record<string, string> = {
  dinheiro: 'Dinheiro',
  debito: 'Débito',
  credito: 'Crédito',
  pix: 'Pix',
}

export const ROTULO_METODO: Record<MetodoPagamento, string> = {
  pix: 'Pix na mesa',
  maquininha: 'Maquininha',
  caixa: 'No caixa',
}

export const contaService = {
  /** Contas em aberto, com as mesas em modo pagamento primeiro. */
  async emAberto(): Promise<Conta[]> {
    const { data } = await api.get<Conta[]>('/contas')
    return data
  },

  async buscar(id: number): Promise<Conta> {
    const { data } = await api.get<Conta>(`/contas/${id}`)
    return data
  },

  async solicitarFechamento(id: number): Promise<Conta> {
    const { data } = await api.post<Conta>(`/contas/${id}/solicitar-fechamento`)
    return data
  },

  async configurarDivisao(id: number, payload: { pessoas?: number; cobrar_taxa_servico?: boolean }): Promise<Conta> {
    const { data } = await api.put<Conta>(`/contas/${id}/divisao`, payload)
    return data
  },

  async pagar(id: number, payload: RegistroPagamento): Promise<Conta> {
    const { data } = await api.post<Conta>(`/contas/${id}/pagar`, payload)
    return data
  },

  /** Confirma a maquininha (débito/crédito) ou o pagamento avisado para o caixa. */
  async confirmarPagamento(pagamentoId: number, forma_pagamento: FormaPagamento, valor_recebido?: number): Promise<Conta> {
    const { data } = await api.post<Conta>(`/pagamentos/${pagamentoId}/confirmar`, { forma_pagamento, valor_recebido })
    return data
  },

  async cancelarPagamento(pagamentoId: number): Promise<Conta> {
    const { data } = await api.post<Conta>(`/pagamentos/${pagamentoId}/cancelar`)
    return data
  },
}

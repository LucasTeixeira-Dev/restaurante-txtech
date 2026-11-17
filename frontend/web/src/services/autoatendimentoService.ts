import { api } from '@/lib/api'
import type { Conta, MetodoPagamento, Pagamento, Pedido } from '@/types'

export interface SessaoMesa {
  mesa: { id: number; numero: number }
  /** Conta em aberto (ou em modo pagamento). */
  conta: Conta | null
  /** Conta paga há pouco: o tablet mostra o comprovante. */
  ultima_conta_paga: Conta | null
  /** Desenvolvimento: Pix simulado, o tablet mostra "simular pagamento". */
  pix_simulado: boolean
}

export interface ItemCarrinho {
  produto_id: number
  quantidade: number
  observacoes?: string
}

/** Rotas do tablet de autoatendimento (login de papel "mesa"). */
export const autoatendimentoService = {
  async sessao(): Promise<SessaoMesa> {
    const { data } = await api.get<SessaoMesa>('/autoatendimento/sessao')
    return data
  },

  async fazerPedido(itens: ItemCarrinho[], observacoes?: string): Promise<Pedido> {
    const { data } = await api.post<Pedido>('/autoatendimento/pedidos', { itens, observacoes })
    return data
  },

  /** Entra no modo pagamento. */
  async pedirConta(): Promise<Conta> {
    const { data } = await api.post<Conta>('/autoatendimento/pedir-conta')
    return data
  },

  /** Sai do modo pagamento (só antes do primeiro pagamento). */
  async voltarAoCardapio(): Promise<Conta> {
    const { data } = await api.post<Conta>('/autoatendimento/voltar-cardapio')
    return data
  },

  async configurarDivisao(payload: { pessoas?: number; cobrar_taxa_servico?: boolean }): Promise<Conta> {
    const { data } = await api.put<Conta>('/autoatendimento/conta/divisao', payload)
    return data
  },

  /** Pix devolve o código do QR; maquininha e caixa avisam a equipe. */
  async pagar(parte: number, metodo: MetodoPagamento): Promise<Pagamento> {
    const { data } = await api.post<Pagamento>('/autoatendimento/pagamentos', { parte, metodo })
    return data
  },

  async simularPix(pagamentoId: number): Promise<Pagamento> {
    const { data } = await api.post<Pagamento>(`/autoatendimento/pagamentos/${pagamentoId}/simular-pix`)
    return data
  },
}

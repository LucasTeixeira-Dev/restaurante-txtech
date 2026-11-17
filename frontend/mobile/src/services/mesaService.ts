import { api } from '@/lib/api'
import type { Mesa } from '@/types'

export const mesaService = {
  listar: (): Promise<Mesa[]> =>
    api.get('/mesas').then((r) => r.data),

  buscarPorQr: (token: string): Promise<Mesa> =>
    api.get(`/mesas/qr/${token}`).then((r) => r.data),

  atualizarStatus: (id: number, status: Mesa['status']): Promise<Mesa> =>
    api.post(`/mesas/${id}/status`, { status }).then((r) => r.data),

  atenderChamado: (id: number): Promise<Mesa> =>
    api.post(`/mesas/${id}/atender-chamado`).then((r) => r.data),

  /** Garçom confirma a maquininha que levou à mesa (débito ou crédito). */
  confirmarMaquininha: (pagamentoId: number, forma: 'debito' | 'credito'): Promise<{ status: string }> =>
    api.post(`/pagamentos/${pagamentoId}/confirmar`, { forma_pagamento: forma }).then((r) => r.data),

  /** Garçom avisa o caixa que a mesa quer fechar a conta. */
  pedirConta: (contaId: number): Promise<void> =>
    api.post(`/contas/${contaId}/solicitar-fechamento`).then(() => undefined),
}

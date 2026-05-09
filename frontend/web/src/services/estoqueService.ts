import { api } from '@/lib/api'
import type { Estoque } from '@/types'

export interface MovimentacaoPayload {
  tipo: 'entrada' | 'saida' | 'ajuste'
  quantidade: number
  observacoes?: string
}

export const estoqueService = {
  listar: (params?: { search?: string; abaixo_minimo?: boolean }): Promise<Estoque[]> =>
    api.get('/estoque', { params }).then((r) => r.data.data ?? r.data),

  buscar: (id: number): Promise<Estoque> =>
    api.get(`/estoque/${id}`).then((r) => r.data.data ?? r.data),

  movimentar: (id: number, data: MovimentacaoPayload): Promise<Estoque> =>
    api.post(`/estoque/${id}/movimentar`, data).then((r) => r.data.data ?? r.data),
}

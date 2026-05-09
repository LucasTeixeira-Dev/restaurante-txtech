import { api } from '@/lib/api'
import type { Estoque } from '@/types'

export interface MovimentacaoPayload {
  tipo: 'entrada' | 'saida' | 'ajuste'
  quantidade: number
  motivo?: string
}

export const estoqueService = {
  listar: (params?: { search?: string; abaixo_minimo?: boolean }): Promise<Estoque[]> =>
    api.get('/estoque', { params }).then((r: { data: any }) => r.data.data ?? r.data),

  buscar: (produtoId: number): Promise<Estoque> =>
    api.get(`/estoque/${produtoId}`).then((r: { data: any }) => r.data.data ?? r.data),

  movimentar: (produtoId: number, data: MovimentacaoPayload): Promise<Estoque> =>
    api.post(`/estoque/${produtoId}/movimentacao`, data).then((r: { data: any }) => r.data.data ?? r.data),
}

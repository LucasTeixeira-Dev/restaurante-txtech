import { api } from '@/lib/api'
import type { PaginatedResponse, Produto } from '@/types'

interface ProdutoFiltros {
  categoria_id?: number
  disponivel?: boolean
  search?: string
  per_page?: number
  page?: number
}

export const produtoService = {
  async listar(filtros?: ProdutoFiltros): Promise<PaginatedResponse<Produto>> {
    const { data } = await api.get<PaginatedResponse<Produto>>('/produtos', { params: filtros })
    return data
  },

  async buscar(id: number): Promise<Produto> {
    const { data } = await api.get<Produto>(`/produtos/${id}`)
    return data
  },

  async criar(payload: FormData): Promise<Produto> {
    const { data } = await api.post<Produto>('/produtos', payload, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  async atualizar(id: number, payload: FormData | Partial<Produto>): Promise<Produto> {
    const isFormData = payload instanceof FormData
    const { data } = await api.put<Produto>(`/produtos/${id}`, payload, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : {},
    })
    return data
  },

  async remover(id: number): Promise<void> {
    await api.delete(`/produtos/${id}`)
  },

  async cardapio(): Promise<{ id: number; nome: string; produtos: Produto[] }[]> {
    const { data } = await api.get('/cardapio')
    return data
  },
}

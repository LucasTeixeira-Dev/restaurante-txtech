import { api } from '@/lib/api'
import type { Categoria } from '@/types'

export const categoriaService = {
  async listar(): Promise<Categoria[]> {
    const { data } = await api.get<Categoria[]>('/categorias')
    return data
  },

  async criar(payload: Omit<Categoria, 'id'>): Promise<Categoria> {
    const { data } = await api.post<Categoria>('/categorias', payload)
    return data
  },

  async atualizar(id: number, payload: Partial<Categoria>): Promise<Categoria> {
    const { data } = await api.put<Categoria>(`/categorias/${id}`, payload)
    return data
  },

  async remover(id: number): Promise<void> {
    await api.delete(`/categorias/${id}`)
  },
}

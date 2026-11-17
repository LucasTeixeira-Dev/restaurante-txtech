import { api } from '@/lib/api'
import type { Mesa } from '@/types'

export const mesaService = {
  async listar(status?: string): Promise<Mesa[]> {
    const { data } = await api.get<Mesa[]>('/mesas', { params: status ? { status } : undefined })
    return data
  },

  async buscar(id: number): Promise<Mesa> {
    const { data } = await api.get<Mesa>(`/mesas/${id}`)
    return data
  },

  async criar(payload: { numero: number; capacidade?: number }): Promise<Mesa> {
    const { data } = await api.post<Mesa>('/mesas', payload)
    return data
  },

  async atualizar(id: number, payload: Partial<Mesa>): Promise<Mesa> {
    const { data } = await api.put<Mesa>(`/mesas/${id}`, payload)
    return data
  },

  async atualizarStatus(id: number, status: Mesa['status']): Promise<Mesa> {
    const { data } = await api.post<Mesa>(`/mesas/${id}/status`, { status })
    return data
  },

  async remover(id: number): Promise<void> {
    await api.delete(`/mesas/${id}`)
  },

  /** Liga/desliga o tablet da mesa; senha obrigatória na primeira ativação. */
  async configurarAutoatendimento(id: number, payload: { ativo: boolean; senha?: string }): Promise<Mesa> {
    const { data } = await api.put<Mesa>(`/mesas/${id}/autoatendimento`, payload)
    return data
  },

  async atenderChamado(id: number): Promise<Mesa> {
    const { data } = await api.post<Mesa>(`/mesas/${id}/atender-chamado`)
    return data
  },
}

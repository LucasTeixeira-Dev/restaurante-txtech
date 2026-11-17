import { api } from '@/lib/api'
import type { PaginatedResponse, Pedido, StatusPedido, StatusItemPedido } from '@/types'

interface NovoPedidoPayload {
  mesa_id?: number
  observacoes?: string
  itens: { produto_id: number; quantidade: number; observacoes?: string }[]
}

interface PedidoFiltros {
  status?: StatusPedido
  mesa_id?: number
  per_page?: number
  page?: number
}

export const pedidoService = {
  async listar(filtros?: PedidoFiltros): Promise<PaginatedResponse<Pedido>> {
    const { data } = await api.get<PaginatedResponse<Pedido>>('/pedidos', { params: filtros })
    return data
  },

  async buscar(id: number): Promise<Pedido> {
    const { data } = await api.get<Pedido>(`/pedidos/${id}`)
    return data
  },

  async criar(payload: NovoPedidoPayload): Promise<Pedido> {
    const { data } = await api.post<Pedido>('/pedidos', payload)
    return data
  },

  async atualizarStatus(id: number, status: StatusPedido): Promise<Pedido> {
    const { data } = await api.put<Pedido>(`/pedidos/${id}/status`, { status })
    return data
  },

  async atualizarStatusItem(
    pedidoId: number,
    itemId: number,
    status: StatusItemPedido,
  ): Promise<void> {
    await api.put(`/pedidos/${pedidoId}/itens/${itemId}/status`, { status })
  },

  async cancelar(id: number): Promise<void> {
    await api.delete(`/pedidos/${id}`)
  },

  async adicionarItens(id: number, itens: NovoPedidoPayload['itens']): Promise<Pedido> {
    const { data } = await api.post<Pedido>(`/pedidos/${id}/itens`, { itens })
    return data
  },

  /** Só itens pendentes; os demais devem ser cancelados. */
  async removerItem(id: number, itemId: number): Promise<Pedido> {
    const { data } = await api.delete<Pedido>(`/pedidos/${id}/itens/${itemId}`)
    return data
  },
}

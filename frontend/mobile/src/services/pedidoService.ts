import { api } from '@/lib/api'
import type { Pedido, CartItem, StatusPedido, StatusItemPedido } from '@/types'

export interface NovoPedidoPayload {
  mesa_id?: number | null
  observacoes?: string
  itens: {
    produto_id: number
    quantidade: number
    observacoes?: string
  }[]
}

export const pedidoService = {
  listar: (params?: { status?: StatusPedido }): Promise<Pedido[]> =>
    api.get('/pedidos', { params }).then((r) => r.data.data ?? r.data),

  buscar: (id: number): Promise<Pedido> =>
    api.get(`/pedidos/${id}`).then((r) => r.data),

  criar: (payload: NovoPedidoPayload): Promise<Pedido> =>
    api.post('/pedidos', payload).then((r) => r.data),

  atualizarStatus: (id: number, status: StatusPedido): Promise<Pedido> =>
    api.put(`/pedidos/${id}/status`, { status }).then((r) => r.data),

  atualizarStatusItem: (pedidoId: number, itemId: number, status: StatusItemPedido): Promise<void> =>
    api.put(`/pedidos/${pedidoId}/itens/${itemId}/status`, { status }).then(() => undefined),
}

export function carrinhoParaPayload(
  itens: CartItem[],
  mesaId?: number | null,
  observacoes?: string,
): NovoPedidoPayload {
  return {
    mesa_id: mesaId ?? null,
    observacoes,
    itens: itens.map((i) => ({
      produto_id: i.produto.id,
      quantidade: i.quantidade,
      observacoes: i.observacoes || undefined,
    })),
  }
}

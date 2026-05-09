import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { pedidoService } from '@/services/pedidoService'
import { useAuthStore } from '@/stores/authStore'
import { notificar } from './useNotificacoes'
import type { Pedido } from '@/types'

export function usePedidosPolling() {
  const can = useAuthStore((s) => s.can)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  // Mapa de id -> status dos pedidos já conhecidos
  const conhecidos = useRef<Map<number, string>>(new Map())
  const inicializado = useRef(false)

  const { data: pedidos = [] } = useQuery<Pedido[]>({
    queryKey: ['pedidos-polling-notif'],
    queryFn: () => pedidoService.listar(),
    enabled: isAuthenticated(),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  })

  useEffect(() => {
    if (pedidos.length === 0 && !inicializado.current) return

    if (!inicializado.current) {
      // Primeira carga: registra estado atual sem disparar notificações
      pedidos.forEach((p) => conhecidos.current.set(p.id, p.status))
      inicializado.current = true
      return
    }

    pedidos.forEach((pedido) => {
      const statusAnterior = conhecidos.current.get(pedido.id)

      if (statusAnterior === undefined) {
        // Pedido novo chegou
        if (can(['gerente', 'chapeiro'])) {
          const local = pedido.mesa ? `Mesa ${pedido.mesa.numero}` : 'Balcão'
          notificar('🍽️ Novo pedido!', `Pedido #${pedido.id} — ${local}`)
        }
      } else if (statusAnterior !== 'pronto' && pedido.status === 'pronto') {
        // Pedido ficou pronto
        if (can(['gerente', 'garcom'])) {
          const local = pedido.mesa ? `Mesa ${pedido.mesa.numero}` : 'Balcão'
          notificar('✅ Pedido pronto!', `Pedido #${pedido.id} — ${local} aguarda entrega.`)
        }
      }

      conhecidos.current.set(pedido.id, pedido.status)
    })
  }, [pedidos])
}

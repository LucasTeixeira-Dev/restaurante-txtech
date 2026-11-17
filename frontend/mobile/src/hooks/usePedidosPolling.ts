import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { pedidoService } from '@/services/pedidoService'
import { mesaService } from '@/services/mesaService'
import { useAuthStore } from '@/stores/authStore'
import { notificar } from './useNotificacoes'
import type { Mesa, Pedido } from '@/types'

/**
 * Notificações locais por polling (sem push):
 * - chapeiro / bar: pedido novo com itens do seu setor;
 * - garçom: pedido pronto, mesa chamando o garçom, mesa pedindo a conta;
 * - gerente: tudo.
 */
export function usePedidosPolling() {
  const can = useAuthStore((s) => s.can)
  const papel = useAuthStore((s) => s.usuario?.papel)
  const autenticado = useAuthStore((s) => !!s.token && !!s.usuario)
  const salao = can(['gerente', 'garcom'])

  // Mapa de id -> status dos pedidos já conhecidos
  const conhecidos = useRef<Map<number, string>>(new Map())
  const inicializado = useRef(false)

  const { data: pedidos = [] } = useQuery<Pedido[]>({
    queryKey: ['pedidos-polling-notif'],
    queryFn: () => pedidoService.listar(),
    enabled: autenticado,
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

    // Setor de quem está logado; gerente (null) recebe de todos.
    const setor = papel === 'bar' ? 'bar' : papel === 'chapeiro' ? 'cozinha' : null

    pedidos.forEach((pedido) => {
      const statusAnterior = conhecidos.current.get(pedido.id)
      const local = pedido.mesa ? `Mesa ${pedido.mesa.numero}` : 'Balcão'

      if (statusAnterior === undefined) {
        const temItemDoSetor = pedido.itens.some((i) => !setor || i.setor === setor)
        if (can(['gerente', 'chapeiro', 'bar']) && temItemDoSetor) {
          notificar('🍽️ Novo pedido!', `Pedido #${pedido.id} — ${local}`)
        }
      } else if (statusAnterior !== 'pronto' && pedido.status === 'pronto' && salao) {
        notificar('✅ Pedido pronto!', `Pedido #${pedido.id} — ${local} aguarda entrega.`)
      }

      conhecidos.current.set(pedido.id, pedido.status)
    })
  }, [pedidos])

  // Salão: mesas chamando o garçom ou pedindo a conta (tablet de autoatendimento ou caixa).
  const mesasConhecidas = useRef<Map<number, { chamado: boolean; conta: boolean; maquininhas: number[] }> | null>(null)

  const { data: mesas = [] } = useQuery<Mesa[]>({
    queryKey: ['mesas-polling-notif'],
    queryFn: () => mesaService.listar(),
    enabled: autenticado && salao,
    refetchInterval: 20_000,
    refetchIntervalInBackground: false,
  })

  useEffect(() => {
    if (!salao || mesas.length === 0) return

    const atual = new Map(
      mesas.map((m) => [m.id, {
        chamado: !!m.garcom_chamado_em,
        conta: !!m.conta?.conta_solicitada,
        maquininhas: (m.conta?.pagamentos_pendentes ?? []).filter((p) => p.metodo === 'maquininha').map((p) => p.id),
      }]),
    )

    if (mesasConhecidas.current) {
      mesas.forEach((m) => {
        const antes = mesasConhecidas.current?.get(m.id)
        const agora = atual.get(m.id)!
        if (agora.chamado && !antes?.chamado) {
          notificar('🔔 Mesa chamando', `A Mesa ${m.numero} chamou o garçom.`)
        }
        if (agora.conta && !antes?.conta) {
          notificar('🧾 Pediu a conta', `A Mesa ${m.numero} quer fechar a conta.`)
        }
        const novas = agora.maquininhas.filter((id) => !antes?.maquininhas.includes(id))
        if (novas.length > 0) {
          notificar('💳 Maquininha', `A Mesa ${m.numero} pediu a maquininha.`)
        }
      })
    }

    mesasConhecidas.current = atual
  }, [mesas, salao])
}

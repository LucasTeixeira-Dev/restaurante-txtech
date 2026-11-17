import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useEchoChannel } from '@/hooks/useEcho'
import { useAuthStore } from '@/stores/authStore'

/**
 * Avisos do salão para garçom e gerente, em qualquer tela:
 * mesa chamou o garçom, mesa pediu a conta e pedido pronto para entregar.
 * Os ids dos toasts evitam aviso duplicado quando outra tela também avisa.
 */
export function useAvisosSalao() {
  const queryClient = useQueryClient()
  const can = useAuthStore((s) => s.can)

  const aoChamar = useCallback(
    (d: any) => {
      queryClient.invalidateQueries({ queryKey: ['mesas'] })
      if (d?.chamado_em && can(['gerente', 'garcom'])) {
        toast(`Mesa ${d.mesa.numero} chamou o garçom`, { id: `chamado-${d.mesa.id}`, icon: '🔔', duration: 8000 })
      }
    },
    [queryClient, can],
  )

  const aoMudarConta = useCallback(
    (d: any) => {
      queryClient.invalidateQueries({ queryKey: ['mesas'] })
      if (d?.status === 'fechamento_solicitado' && d?.mesa && can(['gerente', 'garcom'])) {
        toast(`Mesa ${d.mesa.numero} pediu a conta`, { id: `conta-${d.id}`, icon: '🧾', duration: 8000 })
      }
    },
    [queryClient, can],
  )

  const aoMudarPedido = useCallback(
    (d: any) => {
      if (d?.status === 'pronto' && can(['gerente', 'garcom'])) {
        toast(`Pedido #${d.id} pronto para entregar`, { id: `pronto-${d.id}`, icon: '✅', duration: 6000 })
      }
    },
    [can],
  )

  // Tablet pediu a maquininha: quem estiver no salão leva até a mesa.
  const aoPedirMaquininha = useCallback(
    (d: any) => {
      queryClient.invalidateQueries({ queryKey: ['mesas'] })
      if (d?.metodo === 'maquininha' && d?.mesa && can(['gerente', 'garcom'])) {
        const parte = d.pessoas > 1 && d.parte ? ` (parte ${d.parte}/${d.pessoas})` : ''
        toast(`Mesa ${d.mesa.numero} pediu a maquininha${parte}: R$ ${Number(d.valor).toFixed(2).replace('.', ',')}`, {
          id: `pg-${d.id}`, icon: '💳', duration: 10000,
        })
      }
    },
    [queryClient, can],
  )

  useEchoChannel('salao', 'mesa.chamado_atualizado', aoChamar)
  useEchoChannel('salao', 'pagamento.solicitado', aoPedirMaquininha)
  useEchoChannel('salao', 'conta.atualizada', aoMudarConta)
  useEchoChannel('pedidos', 'pedido.status_atualizado', aoMudarPedido)
}

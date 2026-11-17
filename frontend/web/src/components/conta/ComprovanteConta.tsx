import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ROTULO_FORMA } from '@/services/contaService'
import type { Conta } from '@/types'

export const brl = (v: number) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`

/**
 * Comprovante simples (sem valor fiscal): consumo, taxa, divisão e pagamentos.
 * Usado no tablet depois do pagamento e na página de impressão do caixa.
 */
export default function ComprovanteConta({ conta }: { conta: Conta }) {
  const itens = (conta.pedidos ?? [])
    .filter((p) => p.status !== 'cancelado')
    .flatMap((p) => p.itens.filter((i) => i.status !== 'cancelado'))
  const pagos = (conta.pagamentos ?? []).filter((p) => p.status === 'aprovado')

  return (
    <div className="text-sm text-gray-800 space-y-4">
      <div className="text-center">
        <p className="font-bold text-base">Restaurante TxTech</p>
        <p className="text-gray-500">
          {conta.mesa ? `Mesa ${conta.mesa.numero}` : `Balcão`} · Conta #{conta.id}
        </p>
        {conta.paga_em && (
          <p className="text-gray-500">{format(new Date(conta.paga_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">Comprovante de consumo, sem valor fiscal</p>
      </div>

      <div className="border-t border-dashed border-gray-300 pt-3 space-y-1">
        {itens.map((i) => (
          <div key={i.id} className="flex justify-between gap-3">
            <span className="min-w-0">{i.quantidade}x {i.produto?.nome}</span>
            <span className="shrink-0">{brl(i.subtotal)}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-dashed border-gray-300 pt-3 space-y-1">
        <div className="flex justify-between"><span>Consumo</span><span>{brl(conta.subtotal)}</span></div>
        <div className="flex justify-between">
          <span>Taxa de serviço{conta.taxa_servico > 0 ? ` (${conta.taxa_servico_percentual}%)` : ' (não incluída)'}</span>
          <span>{brl(conta.taxa_servico)}</span>
        </div>
        <div className="flex justify-between font-bold text-base"><span>Total</span><span>{brl(conta.total)}</span></div>
        {conta.pessoas > 1 && (
          <p className="text-gray-500">Dividida em {conta.pessoas} pessoas</p>
        )}
      </div>

      {pagos.length > 0 && (
        <div className="border-t border-dashed border-gray-300 pt-3 space-y-1">
          <p className="font-semibold">Pagamentos</p>
          {pagos.map((p) => (
            <div key={p.id} className="flex justify-between gap-3">
              <span>
                {p.parte ? `Parte ${p.parte} · ` : ''}
                {ROTULO_FORMA[p.forma ?? ''] ?? p.forma}
                {p.troco && p.troco > 0 ? ` (troco ${brl(p.troco)})` : ''}
              </span>
              <span>{brl(p.valor)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

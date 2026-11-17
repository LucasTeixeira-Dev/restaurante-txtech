<?php

namespace App\Http\Resources;

use App\Models\Conta;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Conta */
class ContaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status,
            'mesa' => $this->whenLoaded('mesa', fn () => $this->mesa ? [
                'id' => $this->mesa->id,
                'numero' => $this->mesa->numero,
            ] : null),
            'subtotal' => round($this->subtotalAtual(), 2),
            'cobrar_taxa_servico' => (bool) $this->cobrar_taxa_servico,
            'taxa_servico_percentual' => Conta::taxaServicoPercentual(),
            // Enquanto aberta: calculado com a escolha atual de taxa. Depois de paga: valores gravados.
            'taxa_servico' => $this->taxaAtual(),
            'total' => $this->totalAtual(),
            'total_pago' => $this->totalPago(),
            'restante' => $this->restante(),
            'pessoas' => (int) $this->pessoas,
            'partes' => $this->partes(),
            'forma_pagamento' => $this->forma_pagamento,
            'valor_recebido' => $this->valor_recebido !== null ? (float) $this->valor_recebido : null,
            'troco' => $this->troco !== null ? (float) $this->troco : null,
            'pedidos_pendentes' => $this->whenLoaded('pedidos', fn () => $this->pedidos
                ->whereNotIn('status', ['entregue', 'cancelado'])
                ->count()),
            'pedidos' => PedidoResource::collection($this->whenLoaded('pedidos')),
            'pagamentos' => PagamentoResource::collection($this->whenLoaded('pagamentos')),
            'aberta_em' => $this->aberta_em?->toIso8601String(),
            'solicitada_em' => $this->solicitada_em?->toIso8601String(),
            'paga_em' => $this->paga_em?->toIso8601String(),
        ];
    }
}

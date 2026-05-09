<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MesaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'numero' => $this->numero,
            'capacidade' => $this->capacidade,
            'status' => $this->status,
            'qr_code_token' => $this->qr_code_token,
            'pedido_ativo' => $this->whenLoaded('pedidoAtivo', fn() => $this->pedidoAtivo ? [
                'id' => $this->pedidoAtivo->id,
                'status' => $this->pedidoAtivo->status,
                'total' => (float) $this->pedidoAtivo->total,
            ] : null),
            'criado_em' => $this->created_at?->toIso8601String(),
        ];
    }
}

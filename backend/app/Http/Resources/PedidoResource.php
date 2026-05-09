<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PedidoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status,
            'total' => (float) $this->total,
            'observacoes' => $this->observacoes,
            'mesa' => $this->whenLoaded('mesa', fn() => $this->mesa ? [
                'id' => $this->mesa->id,
                'numero' => $this->mesa->numero,
            ] : null),
            'usuario' => $this->whenLoaded('usuario', fn() => $this->usuario ? [
                'id' => $this->usuario->id,
                'nome' => $this->usuario->nome,
            ] : null),
            'itens' => $this->whenLoaded('itens', fn() => $this->itens->map(fn($item) => [
                'id' => $item->id,
                'produto_id' => $item->produto_id,
                'produto' => $item->relationLoaded('produto') ? [
                    'id' => $item->produto->id,
                    'nome' => $item->produto->nome,
                ] : null,
                'quantidade' => $item->quantidade,
                'preco_unitario' => (float) $item->preco_unitario,
                'subtotal' => (float) $item->subtotal,
                'status' => $item->status,
                'observacoes' => $item->observacoes,
            ])),
            'criado_em' => $this->created_at?->toIso8601String(),
            'atualizado_em' => $this->updated_at?->toIso8601String(),
        ];
    }
}

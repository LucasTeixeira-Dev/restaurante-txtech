<?php

namespace App\Events;

use App\Models\Pedido;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PedidoCriado implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public readonly Pedido $pedido)
    {
        $this->pedido->load(['mesa', 'usuario', 'itens.produto']);
    }

    public function broadcastOn(): array
    {
        $canais = [new Channel('pedidos')];
        if ($this->pedido->mesa_id) {
            $canais[] = new Channel("mesa.{$this->pedido->mesa_id}");
        }

        return $canais;
    }

    public function broadcastAs(): string
    {
        return 'pedido.criado';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->pedido->id,
            'status' => $this->pedido->status,
            'total' => (float) $this->pedido->total,
            'observacoes' => $this->pedido->observacoes,
            'mesa' => $this->pedido->mesa ? [
                'id' => $this->pedido->mesa->id,
                'numero' => $this->pedido->mesa->numero,
            ] : null,
            'usuario' => $this->pedido->usuario ? [
                'id' => $this->pedido->usuario->id,
                'nome' => $this->pedido->usuario->nome,
            ] : null,
            'itens' => $this->pedido->itens->map(fn($item) => [
                'id' => $item->id,
                'produto' => ['id' => $item->produto->id, 'nome' => $item->produto->nome],
                'quantidade' => $item->quantidade,
                'status' => $item->status,
                'setor' => $item->setor,
                'observacoes' => $item->observacoes,
            ]),
            'criado_em' => $this->pedido->created_at?->toIso8601String(),
        ];
    }
}

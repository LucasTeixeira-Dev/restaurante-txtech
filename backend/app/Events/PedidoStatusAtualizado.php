<?php

namespace App\Events;

use App\Models\Pedido;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PedidoStatusAtualizado implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public readonly Pedido $pedido)
    {
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('pedidos'),
            new Channel("pedido.{$this->pedido->id}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'pedido.status_atualizado';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->pedido->id,
            'status' => $this->pedido->status,
            'mesa_id' => $this->pedido->mesa_id,
            'atualizado_em' => $this->pedido->updated_at?->toIso8601String(),
        ];
    }
}

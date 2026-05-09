<?php

namespace App\Events;

use App\Models\ItemPedido;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ItemPedidoStatusAtualizado implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public readonly ItemPedido $item)
    {
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('pedidos'),
            new Channel("pedido.{$this->item->pedido_id}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'item.status_atualizado';
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->item->id,
            'pedido_id' => $this->item->pedido_id,
            'status' => $this->item->status,
            'atualizado_em' => $this->item->updated_at?->toIso8601String(),
        ];
    }
}

<?php

namespace App\Events;

use App\Models\Mesa;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/** Mesa chamou o garçom (chamado_em preenchido) ou o chamado foi atendido (null). */
class ChamadoGarcomAtualizado implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public readonly Mesa $mesa)
    {
    }

    public function broadcastOn(): array
    {
        return [new Channel('salao'), new Channel("mesa.{$this->mesa->id}")];
    }

    public function broadcastAs(): string
    {
        return 'mesa.chamado_atualizado';
    }

    public function broadcastWith(): array
    {
        return [
            'mesa' => ['id' => $this->mesa->id, 'numero' => $this->mesa->numero],
            'chamado_em' => $this->mesa->garcom_chamado_em?->toIso8601String(),
        ];
    }
}

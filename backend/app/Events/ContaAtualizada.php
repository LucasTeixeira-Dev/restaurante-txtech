<?php

namespace App\Events;

use App\Models\Conta;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Conta aberta, solicitada (mesa pediu a conta), paga ou cancelada.
 * Caixa e salão atualizam seus painéis; o tablet da mesa volta ao início quando ela é paga.
 */
class ContaAtualizada implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public readonly Conta $conta)
    {
    }

    public function broadcastOn(): array
    {
        $canais = [new Channel('caixa'), new Channel('salao')];
        if ($this->conta->mesa_id) {
            $canais[] = new Channel("mesa.{$this->conta->mesa_id}");
        }

        return $canais;
    }

    public function broadcastAs(): string
    {
        return 'conta.atualizada';
    }

    public function broadcastWith(): array
    {
        $mesa = $this->conta->mesa;

        return [
            'id' => $this->conta->id,
            'status' => $this->conta->status,
            'mesa' => $mesa ? ['id' => $mesa->id, 'numero' => $mesa->numero] : null,
            'subtotal' => $this->conta->subtotalAtual(),
            'solicitada_em' => $this->conta->solicitada_em?->toIso8601String(),
        ];
    }
}

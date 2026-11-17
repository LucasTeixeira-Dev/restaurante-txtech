<?php

namespace App\Events;

use App\Models\Pagamento;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/** Mesa pediu a maquininha ou avisou que vai pagar no caixa: salão e caixa são avisados. */
class PagamentoSolicitado implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public readonly Pagamento $pagamento)
    {
    }

    public function broadcastOn(): array
    {
        return [new Channel('caixa'), new Channel('salao')];
    }

    public function broadcastAs(): string
    {
        return 'pagamento.solicitado';
    }

    public function broadcastWith(): array
    {
        $conta = $this->pagamento->conta;

        return [
            'id' => $this->pagamento->id,
            'conta_id' => $conta->id,
            'mesa' => $conta->mesa ? ['id' => $conta->mesa->id, 'numero' => $conta->mesa->numero] : null,
            'metodo' => $this->pagamento->metodo,
            'parte' => $this->pagamento->parte,
            'pessoas' => $conta->pessoas,
            'valor' => (float) $this->pagamento->valor,
        ];
    }
}

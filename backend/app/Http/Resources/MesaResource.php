<?php

namespace App\Http\Resources;

use App\Models\Conta;
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
            // Conta em aberto: o salão vê o consumo e se a mesa pediu a conta.
            'conta' => $this->whenLoaded('contaEmAberto', fn() => $this->contaEmAberto ? [
                'id' => $this->contaEmAberto->id,
                'status' => $this->contaEmAberto->status,
                'conta_solicitada' => $this->contaEmAberto->status === Conta::STATUS_SOLICITADA,
                'subtotal' => round($this->contaEmAberto->calcularSubtotal(), 2),
                'restante' => $this->contaEmAberto->restante(),
                'solicitada_em' => $this->contaEmAberto->solicitada_em?->toIso8601String(),
                // Maquininha pedida pelo tablet (ou aviso de "vou pagar no caixa") esperando a equipe.
                'pagamentos_pendentes' => $this->contaEmAberto->pagamentos
                    ->where('status', 'pendente')
                    ->whereIn('metodo', ['maquininha', 'caixa'])
                    ->map(fn ($p) => [
                        'id' => $p->id,
                        'metodo' => $p->metodo,
                        'parte' => $p->parte,
                        'valor' => (float) $p->valor,
                    ])
                    ->values(),
            ] : null),
            'garcom_chamado_em' => $this->garcom_chamado_em?->toIso8601String(),
            // Só o gerente configura o tablet; os demais só precisam saber se está ativo.
            'autoatendimento' => $this->whenLoaded('usuarioAutoatendimento', fn() => [
                'ativo' => (bool) $this->usuarioAutoatendimento?->ativo,
                'login' => $request->user()?->hasRole('gerente') ? $this->usuarioAutoatendimento?->email : null,
            ]),
            'criado_em' => $this->created_at?->toIso8601String(),
        ];
    }
}

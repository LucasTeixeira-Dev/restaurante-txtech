<?php

namespace App\Http\Resources;

use App\Models\Pagamento;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Pagamento */
class PagamentoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'parte' => $this->parte,
            'valor' => (float) $this->valor,
            'metodo' => $this->metodo,
            'forma' => $this->forma,
            // Pix vencido aparece como expirado mesmo antes de o banco de dados ser atualizado.
            'status' => $this->expirou() ? Pagamento::STATUS_EXPIRADO : $this->status,
            'origem' => $this->origem,
            'valor_recebido' => $this->valor_recebido !== null ? (float) $this->valor_recebido : null,
            'troco' => $this->troco !== null ? (float) $this->troco : null,
            'pix_copia_e_cola' => $this->isPendente() ? $this->pix_copia_e_cola : null,
            'expira_em' => $this->expira_em?->toIso8601String(),
            'pago_em' => $this->pago_em?->toIso8601String(),
            'criado_em' => $this->created_at?->toIso8601String(),
        ];
    }
}

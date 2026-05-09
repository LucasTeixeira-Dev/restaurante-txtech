<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProdutoResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'nome' => $this->nome,
            'descricao' => $this->descricao,
            'preco' => (float) $this->preco,
            'disponivel' => $this->disponivel,
            'tempo_preparo' => $this->tempo_preparo,
            'controla_estoque' => $this->controla_estoque,
            'imagem_url' => $this->getFirstMediaUrl('imagem') ?: null,
            'categoria' => $this->whenLoaded('categoria', fn() => [
                'id' => $this->categoria->id,
                'nome' => $this->categoria->nome,
            ]),
            'criado_em' => $this->created_at?->toIso8601String(),
        ];
    }
}

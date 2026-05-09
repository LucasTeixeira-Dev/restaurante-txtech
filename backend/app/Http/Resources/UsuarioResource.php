<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UsuarioResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'nome' => $this->nome,
            'email' => $this->email,
            'ativo' => $this->ativo,
            'papel' => $this->whenLoaded('roles', fn() => $this->roles->first()?->name),
            'papeis' => $this->whenLoaded('roles', fn() => $this->roles->pluck('name')),
            'criado_em' => $this->created_at?->toIso8601String(),
        ];
    }
}

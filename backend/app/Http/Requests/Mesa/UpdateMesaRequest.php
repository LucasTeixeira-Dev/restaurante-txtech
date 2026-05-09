<?php

namespace App\Http\Requests\Mesa;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMesaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $mesaId = $this->route('mesa')?->id;

        return [
            'numero' => ['sometimes', 'integer', 'min:1', Rule::unique('mesas', 'numero')->ignore($mesaId)],
            'capacidade' => ['sometimes', 'integer', 'min:1', 'max:20'],
            'status' => ['sometimes', 'in:livre,ocupada,reservada'],
        ];
    }

    public function messages(): array
    {
        return [
            'numero.unique' => 'Já existe uma mesa com este número.',
            'status.in' => 'Status inválido. Use: livre, ocupada ou reservada.',
        ];
    }
}

<?php

namespace App\Http\Requests\Mesa;

use Illuminate\Foundation\Http\FormRequest;

class StoreMesaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'numero' => ['required', 'integer', 'min:1', 'unique:mesas,numero'],
            'capacidade' => ['integer', 'min:1', 'max:20'],
        ];
    }

    public function messages(): array
    {
        return [
            'numero.required' => 'O número da mesa é obrigatório.',
            'numero.unique' => 'Já existe uma mesa com este número.',
            'numero.min' => 'O número da mesa deve ser maior que zero.',
            'capacidade.min' => 'A capacidade deve ser de pelo menos 1 pessoa.',
        ];
    }
}

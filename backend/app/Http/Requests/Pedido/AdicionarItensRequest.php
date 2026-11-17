<?php

namespace App\Http\Requests\Pedido;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AdicionarItensRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'itens' => ['required', 'array', 'min:1'],
            'itens.*.produto_id' => ['required', Rule::exists('produtos', 'id')->whereNull('deleted_at')],
            'itens.*.quantidade' => ['required', 'integer', 'min:1', 'max:999'],
            'itens.*.observacoes' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'itens.required' => 'Informe pelo menos um item.',
            'itens.min' => 'Informe pelo menos um item.',
            'itens.*.produto_id.required' => 'O produto é obrigatório em cada item.',
            'itens.*.produto_id.exists' => 'Produto não encontrado.',
            'itens.*.quantidade.required' => 'A quantidade é obrigatória em cada item.',
            'itens.*.quantidade.min' => 'A quantidade deve ser de pelo menos 1.',
        ];
    }
}

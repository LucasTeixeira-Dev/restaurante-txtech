<?php

namespace App\Http\Requests\Pedido;

use Illuminate\Foundation\Http\FormRequest;

class StorePedidoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'mesa_id' => ['nullable', 'exists:mesas,id'],
            'observacoes' => ['nullable', 'string', 'max:500'],
            'itens' => ['required', 'array', 'min:1'],
            'itens.*.produto_id' => ['required', 'exists:produtos,id'],
            'itens.*.quantidade' => ['required', 'integer', 'min:1'],
            'itens.*.observacoes' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'mesa_id.exists' => 'Mesa não encontrada.',
            'itens.required' => 'O pedido deve ter pelo menos um item.',
            'itens.min' => 'O pedido deve ter pelo menos um item.',
            'itens.*.produto_id.required' => 'O produto é obrigatório em cada item.',
            'itens.*.produto_id.exists' => 'Produto não encontrado.',
            'itens.*.quantidade.required' => 'A quantidade é obrigatória em cada item.',
            'itens.*.quantidade.min' => 'A quantidade deve ser de pelo menos 1.',
        ];
    }
}

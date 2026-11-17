<?php

namespace App\Http\Requests\Pedido;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePedidoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // whereNull: o exists simples aceitaria mesas/produtos removidos (soft delete).
            'mesa_id' => ['nullable', Rule::exists('mesas', 'id')->whereNull('deleted_at')],
            'observacoes' => ['nullable', 'string', 'max:500'],
            'itens' => ['required', 'array', 'min:1'],
            'itens.*.produto_id' => ['required', Rule::exists('produtos', 'id')->whereNull('deleted_at')],
            'itens.*.quantidade' => ['required', 'integer', 'min:1', 'max:999'],
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

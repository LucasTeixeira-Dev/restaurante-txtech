<?php

namespace App\Http\Requests\Produto;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProdutoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'categoria_id' => ['sometimes', 'exists:categorias,id'],
            'nome' => ['sometimes', 'string', 'max:100'],
            'descricao' => ['nullable', 'string', 'max:500'],
            'preco' => ['sometimes', 'numeric', 'min:0.01'],
            'disponivel' => ['sometimes', 'boolean'],
            'tempo_preparo' => ['sometimes', 'integer', 'min:1', 'max:120'],
            'controla_estoque' => ['sometimes', 'boolean'],
            'imagem' => ['nullable', 'image', 'max:2048'],
        ];
    }

    public function messages(): array
    {
        return [
            'categoria_id.exists' => 'Categoria não encontrada.',
            'preco.min' => 'O preço deve ser maior que zero.',
            'imagem.image' => 'O arquivo deve ser uma imagem.',
            'imagem.max' => 'A imagem deve ter no máximo 2MB.',
        ];
    }
}

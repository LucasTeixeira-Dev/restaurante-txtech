<?php

namespace App\Http\Requests\Produto;

use Illuminate\Foundation\Http\FormRequest;

class StoreProdutoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'categoria_id' => ['required', 'exists:categorias,id'],
            'nome' => ['required', 'string', 'max:100'],
            'descricao' => ['nullable', 'string', 'max:500'],
            'preco' => ['required', 'numeric', 'min:0.01'],
            'disponivel' => ['boolean'],
            'tempo_preparo' => ['integer', 'min:1', 'max:120'],
            'controla_estoque' => ['boolean'],
            'imagem' => ['nullable', 'image', 'max:2048'],
        ];
    }

    public function messages(): array
    {
        return [
            'categoria_id.required' => 'A categoria é obrigatória.',
            'categoria_id.exists' => 'Categoria não encontrada.',
            'nome.required' => 'O nome do produto é obrigatório.',
            'preco.required' => 'O preço é obrigatório.',
            'preco.min' => 'O preço deve ser maior que zero.',
            'imagem.image' => 'O arquivo deve ser uma imagem.',
            'imagem.max' => 'A imagem deve ter no máximo 2MB.',
        ];
    }
}

<?php

namespace App\Http\Requests\Usuario;

use App\Models\Usuario;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUsuarioRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $usuarioId = $this->route('usuario')?->id;

        return [
            'nome' => ['sometimes', 'string', 'max:100'],
            'email' => ['sometimes', 'email', Rule::unique('usuarios', 'email')->ignore($usuarioId)],
            'senha' => ['sometimes', 'nullable', 'string', 'min:6'],
            'papel' => ['sometimes', Rule::in(Usuario::PAPEIS_EQUIPE)],
            'ativo' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.email' => 'Informe um e-mail válido.',
            'email.unique' => 'Este e-mail já está em uso.',
            'senha.min' => 'A senha deve ter no mínimo 6 caracteres.',
            'papel.in' => 'Papel inválido. Use: gerente, garcom, chapeiro, caixa ou bar.',
        ];
    }
}

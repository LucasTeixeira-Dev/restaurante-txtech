<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Categoria;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CategoriaController extends Controller
{
    public function index(): JsonResponse
    {
        $categorias = Categoria::orderBy('ordem')->get();

        return response()->json($categorias);
    }

    public function store(Request $request): JsonResponse
    {
        $dados = $request->validate([
            'nome' => ['required', 'string', 'max:100', 'unique:categorias,nome'],
            'descricao' => ['nullable', 'string', 'max:255'],
            'setor' => ['sometimes', Rule::in(Categoria::SETORES)],
            'ativo' => ['boolean'],
            'ordem' => ['integer', 'min:0'],
        ], [
            'nome.required' => 'O nome é obrigatório.',
            'nome.unique' => 'Já existe uma categoria com este nome.',
        ]);

        $categoria = Categoria::create($dados);

        return response()->json($categoria, 201);
    }

    public function show(Categoria $categoria): JsonResponse
    {
        return response()->json($categoria->load('produtos'));
    }

    public function update(Request $request, Categoria $categoria): JsonResponse
    {
        $dados = $request->validate([
            'nome' => ['sometimes', 'string', 'max:100', Rule::unique('categorias', 'nome')->ignore($categoria->id)],
            'descricao' => ['nullable', 'string', 'max:255'],
            'setor' => ['sometimes', Rule::in(Categoria::SETORES)],
            'ativo' => ['sometimes', 'boolean'],
            'ordem' => ['sometimes', 'integer', 'min:0'],
        ], [
            'nome.unique' => 'Já existe uma categoria com este nome.',
        ]);

        $categoria->update($dados);

        return response()->json($categoria);
    }

    public function destroy(Categoria $categoria): JsonResponse
    {
        $categoria->delete();

        return response()->json(['message' => 'Categoria removida com sucesso.']);
    }
}

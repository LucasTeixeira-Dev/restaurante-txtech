<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProdutoResource;
use App\Models\Categoria;
use App\Models\Produto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CardapioController extends Controller
{
    /** Categorias ativas com os produtos disponíveis (formato do ProdutoResource: preço numérico e imagem_url). */
    public function index(Request $request): JsonResponse
    {
        $categorias = Categoria::with([
            'produtos' => fn($q) => $q->disponiveis()->with('media')->orderBy('nome'),
        ])
            ->ativas()
            ->get()
            ->map(fn (Categoria $c) => [
                'id' => $c->id,
                'nome' => $c->nome,
                'descricao' => $c->descricao,
                'setor' => $c->setor,
                'ordem' => $c->ordem,
                'produtos' => ProdutoResource::collection($c->produtos)->resolve($request),
            ]);

        return response()->json($categorias);
    }

    public function show(Produto $produto): JsonResponse
    {
        if (!$produto->disponivel) {
            return response()->json(['message' => 'Produto indisponível.'], 404);
        }

        return response()->json(new ProdutoResource($produto->load(['categoria', 'media'])));
    }
}

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
    public function index(Request $request): JsonResponse
    {
        $categorias = Categoria::with([
            'produtos' => fn($q) => $q->disponiveis()->with('media'),
        ])
            ->ativas()
            ->get();

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

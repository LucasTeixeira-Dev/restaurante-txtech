<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Produto\StoreProdutoRequest;
use App\Http\Requests\Produto\UpdateProdutoRequest;
use App\Http\Resources\ProdutoResource;
use App\Models\Produto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProdutoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $produtos = Produto::with(['categoria', 'media'])
            ->when($request->filled('categoria_id'), fn($q) => $q->where('categoria_id', $request->categoria_id))
            ->when($request->filled('disponivel'), fn($q) => $q->where('disponivel', $request->boolean('disponivel')))
            ->when($request->filled('search'), fn($q) => $q->where('nome', 'like', "%{$request->search}%"))
            ->orderBy('nome')
            ->paginate($request->input('per_page', 20));

        return response()->json(ProdutoResource::collection($produtos)->response()->getData(true));
    }

    public function store(StoreProdutoRequest $request): JsonResponse
    {
        $produto = Produto::create($request->validated());

        if ($request->hasFile('imagem')) {
            $produto->addMediaFromRequest('imagem')->toMediaCollection('imagem');
        }

        return response()->json(new ProdutoResource($produto->load(['categoria', 'media'])), 201);
    }

    public function show(Produto $produto): JsonResponse
    {
        return response()->json(new ProdutoResource($produto->load(['categoria', 'media'])));
    }

    public function update(UpdateProdutoRequest $request, Produto $produto): JsonResponse
    {
        $produto->update($request->validated());

        if ($request->hasFile('imagem')) {
            $produto->clearMediaCollection('imagem');
            $produto->addMediaFromRequest('imagem')->toMediaCollection('imagem');
        }

        return response()->json(new ProdutoResource($produto->load(['categoria', 'media'])));
    }

    public function destroy(Produto $produto): JsonResponse
    {
        $produto->delete();

        return response()->json(['message' => 'Produto removido com sucesso.']);
    }
}

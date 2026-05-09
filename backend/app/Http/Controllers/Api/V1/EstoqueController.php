<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Estoque;
use App\Models\EstoqueMovimentacao;
use App\Models\Produto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EstoqueController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $estoques = Estoque::with('produto.categoria')
            ->when($request->boolean('abaixo_minimo'), fn($q) => $q->abaixoMinimo())
            ->orderBy('id')
            ->paginate($request->input('per_page', 20));

        return response()->json($estoques);
    }

    public function show(Produto $produto): JsonResponse
    {
        $estoque = $produto->estoque()->with('movimentacoes')->firstOrFail();

        return response()->json($estoque);
    }

    public function movimentar(Request $request, Produto $produto): JsonResponse
    {
        $request->validate([
            'tipo' => ['required', 'in:entrada,saida,ajuste'],
            'quantidade' => ['required', 'numeric', 'min:0.001'],
            'motivo' => ['nullable', 'string', 'max:255'],
        ], [
            'tipo.required' => 'O tipo de movimentação é obrigatório.',
            'tipo.in' => 'Tipo inválido. Use: entrada, saida ou ajuste.',
            'quantidade.required' => 'A quantidade é obrigatória.',
            'quantidade.min' => 'A quantidade deve ser maior que zero.',
        ]);

        return DB::transaction(function () use ($request, $produto) {
            $estoque = $produto->estoque()->firstOrCreate(
                ['produto_id' => $produto->id],
                ['quantidade' => 0, 'quantidade_minima' => 0]
            );

            $quantidadeAnterior = $estoque->quantidade;
            $novaQuantidade = match ($request->tipo) {
                'entrada' => $quantidadeAnterior + $request->quantidade,
                'saida' => max(0, $quantidadeAnterior - $request->quantidade),
                'ajuste' => $request->quantidade,
            };

            $estoque->update(['quantidade' => $novaQuantidade]);

            EstoqueMovimentacao::create([
                'produto_id' => $produto->id,
                'usuario_id' => $request->user()->id,
                'tipo' => $request->tipo,
                'quantidade' => $request->quantidade,
                'quantidade_anterior' => $quantidadeAnterior,
                'quantidade_posterior' => $novaQuantidade,
                'motivo' => $request->motivo,
            ]);

            return response()->json([
                'message' => 'Movimentação registrada com sucesso.',
                'estoque' => $estoque->fresh(),
            ]);
        });
    }
}

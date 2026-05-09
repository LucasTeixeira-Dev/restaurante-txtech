<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Caixa;
use App\Models\Pedido;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CaixaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $caixas = Caixa::with(['usuario', 'usuarioFechamento'])
            ->orderByDesc('aberto_em')
            ->paginate($request->input('per_page', 15));

        return response()->json($caixas);
    }

    public function atual(): JsonResponse
    {
        $caixa = Caixa::with('usuario')->aberto()->latest('aberto_em')->first();

        if (!$caixa) {
            return response()->json(['message' => 'Nenhum caixa aberto.'], 404);
        }

        return response()->json($caixa);
    }

    public function abrir(Request $request): JsonResponse
    {
        $request->validate([
            'saldo_inicial' => ['required', 'numeric', 'min:0'],
            'observacoes' => ['nullable', 'string', 'max:500'],
        ], [
            'saldo_inicial.required' => 'O saldo inicial é obrigatório.',
            'saldo_inicial.min' => 'O saldo inicial não pode ser negativo.',
        ]);

        $jaAberto = Caixa::aberto()->exists();
        if ($jaAberto) {
            return response()->json(['message' => 'Já existe um caixa aberto.'], 422);
        }

        $caixa = Caixa::create([
            'usuario_id' => $request->user()->id,
            'saldo_inicial' => $request->saldo_inicial,
            'aberto_em' => now(),
            'observacoes' => $request->observacoes,
        ]);

        return response()->json($caixa, 201);
    }

    public function fechar(Request $request): JsonResponse
    {
        $request->validate([
            'saldo_final' => ['required', 'numeric', 'min:0'],
            'observacoes' => ['nullable', 'string', 'max:500'],
        ], [
            'saldo_final.required' => 'O saldo final é obrigatório.',
        ]);

        $caixa = Caixa::aberto()->latest('aberto_em')->first();
        if (!$caixa) {
            return response()->json(['message' => 'Nenhum caixa aberto para fechar.'], 404);
        }

        $totalVendas = Pedido::where('status', Pedido::STATUS_ENTREGUE)
            ->whereBetween('updated_at', [$caixa->aberto_em, now()])
            ->sum('total');

        $caixa->update([
            'usuario_fechamento_id' => $request->user()->id,
            'saldo_final' => $request->saldo_final,
            'total_vendas' => $totalVendas,
            'fechado_em' => now(),
            'observacoes' => $request->observacoes ?? $caixa->observacoes,
        ]);

        return response()->json($caixa->load(['usuario', 'usuarioFechamento']));
    }

    public function show(Caixa $caixa): JsonResponse
    {
        return response()->json($caixa->load(['usuario', 'usuarioFechamento']));
    }
}

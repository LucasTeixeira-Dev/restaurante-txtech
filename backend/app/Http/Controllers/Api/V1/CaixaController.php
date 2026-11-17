<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Caixa;
use App\Models\Conta;
use App\Models\Pagamento;
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

        // Parcial do caixa aberto: contas já recebidas nele.
        $caixa->total_vendas = $this->totalRecebido($caixa);
        $caixa->setAttribute('por_forma_pagamento', $this->porFormaPagamento($caixa));
        $caixa->setAttribute('contas_pagas', Conta::pagas()->where('caixa_id', $caixa->id)->count());

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

        $totalVendas = $this->totalRecebido($caixa);

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
        $caixa->load(['usuario', 'usuarioFechamento']);
        $caixa->setAttribute('por_forma_pagamento', $this->porFormaPagamento($caixa));

        return response()->json($caixa);
    }

    /** Soma dos pagamentos aprovados neste caixa (inclui partes de contas divididas e taxa). */
    private function totalRecebido(Caixa $caixa): float
    {
        return round((float) Pagamento::aprovados()->where('caixa_id', $caixa->id)->sum('valor'), 2);
    }

    /** @return array<string, float> ex.: ['dinheiro' => 120.5, 'pix' => 80] */
    private function porFormaPagamento(Caixa $caixa): array
    {
        return Pagamento::aprovados()
            ->where('caixa_id', $caixa->id)
            ->selectRaw('forma, SUM(valor) as total')
            ->groupBy('forma')
            ->pluck('total', 'forma')
            ->map(fn ($v) => round((float) $v, 2))
            ->all();
    }
}

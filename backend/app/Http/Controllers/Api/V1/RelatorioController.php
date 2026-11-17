<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Conta;
use App\Models\Estoque;
use App\Models\ItemPedido;
use App\Models\Pagamento;
use App\Models\Pedido;
use App\Services\ResumoVendas;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RelatorioController extends Controller
{
    public function vendas(Request $request): JsonResponse
    {
        $inicio = $request->input('data_inicio', now()->startOfMonth()->toDateString());
        $fim = $request->input('data_fim', now()->toDateString());

        $dados = ResumoVendas::porDia($inicio, $fim);

        return response()->json($dados);
    }

    public function produtosMaisVendidos(Request $request): JsonResponse
    {
        $inicio = $request->input('data_inicio', now()->startOfMonth()->toDateString());
        $fim = $request->input('data_fim', now()->toDateString());
        $limite = $request->input('limite', 10);

        $produtos = ItemPedido::join('pedidos', 'itens_pedido.pedido_id', '=', 'pedidos.id')
            ->join('produtos', 'itens_pedido.produto_id', '=', 'produtos.id')
            ->where('pedidos.status', Pedido::STATUS_ENTREGUE)
            ->where('itens_pedido.status', '!=', 'cancelado')
            ->whereBetween(DB::raw('DATE(pedidos.entregue_em)'), [$inicio, $fim])
            ->selectRaw('produtos.id, produtos.nome, SUM(itens_pedido.quantidade) as total_vendido, SUM(itens_pedido.subtotal) as receita')
            ->groupBy('produtos.id', 'produtos.nome')
            ->orderByDesc('total_vendido')
            ->limit($limite)
            ->get();

        return response()->json($produtos);
    }

    public function financeiro(Request $request): JsonResponse
    {
        $inicio = $request->input('data_inicio', now()->startOfMonth()->toDateString());
        $fim = $request->input('data_fim', now()->toDateString());

        // Receita = pagamentos aprovados no período (dinheiro que entrou, com taxa de serviço).
        $pagamentos = Pagamento::aprovados()->whereBetween(DB::raw('DATE(pago_em)'), [$inicio, $fim]);
        $receita = (float) (clone $pagamentos)->sum('valor');
        $porForma = (clone $pagamentos)
            ->selectRaw("COALESCE(forma, 'nao_informado') as forma_pg, SUM(valor) as total")
            ->groupBy('forma_pg')
            ->pluck('total', 'forma_pg')
            ->map(fn ($v) => round((float) $v, 2));

        // Contas quitadas no período (ticket médio por mesa/conta e taxa de serviço).
        $contas = Conta::pagas()->whereBetween(DB::raw('DATE(paga_em)'), [$inicio, $fim]);
        $taxaServico = (float) (clone $contas)->sum('taxa_servico');
        $qtdContas = (clone $contas)->count();

        $pedidosCancelados = Pedido::where('status', Pedido::STATUS_CANCELADO)
            ->whereBetween(DB::raw('DATE(updated_at)'), [$inicio, $fim])
            ->count();

        return response()->json([
            'periodo' => ['inicio' => $inicio, 'fim' => $fim],
            'receita_total' => round($receita, 2),
            'taxa_servico_total' => round($taxaServico, 2),
            'contas_pagas' => $qtdContas,
            'ticket_medio' => $qtdContas > 0 ? round($receita / $qtdContas, 2) : 0,
            'por_forma_pagamento' => $porForma,
            'pedidos_cancelados' => $pedidosCancelados,
        ]);
    }

    public function estoque(Request $request): JsonResponse
    {
        $estoques = Estoque::with('produto.categoria')
            ->get()
            ->map(fn($e) => [
                'produto' => $e->produto->nome,
                'categoria' => $e->produto->categoria?->nome,
                'quantidade' => $e->quantidade,
                'quantidade_minima' => $e->quantidade_minima,
                'unidade' => $e->unidade,
                'abaixo_minimo' => $e->estaBaixo(),
            ]);

        return response()->json($estoques);
    }
}

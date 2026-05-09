<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Estoque;
use App\Models\ItemPedido;
use App\Models\Pedido;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RelatorioController extends Controller
{
    public function vendas(Request $request): JsonResponse
    {
        $inicio = $request->input('inicio', now()->startOfMonth()->toDateString());
        $fim = $request->input('fim', now()->toDateString());

        $dados = Pedido::where('status', Pedido::STATUS_ENTREGUE)
            ->whereBetween(DB::raw('DATE(updated_at)'), [$inicio, $fim])
            ->selectRaw('DATE(updated_at) as data, COUNT(*) as total_pedidos, SUM(total) as receita')
            ->groupBy('data')
            ->orderBy('data')
            ->get();

        $totais = [
            'total_pedidos' => $dados->sum('total_pedidos'),
            'receita_total' => $dados->sum('receita'),
        ];

        return response()->json(compact('dados', 'totais'));
    }

    public function produtosMaisVendidos(Request $request): JsonResponse
    {
        $inicio = $request->input('inicio', now()->startOfMonth()->toDateString());
        $fim = $request->input('fim', now()->toDateString());
        $limite = $request->input('limite', 10);

        $produtos = ItemPedido::join('pedidos', 'itens_pedido.pedido_id', '=', 'pedidos.id')
            ->join('produtos', 'itens_pedido.produto_id', '=', 'produtos.id')
            ->where('pedidos.status', Pedido::STATUS_ENTREGUE)
            ->whereBetween(DB::raw('DATE(pedidos.updated_at)'), [$inicio, $fim])
            ->selectRaw('produtos.id, produtos.nome, SUM(itens_pedido.quantidade) as total_vendido, SUM(itens_pedido.subtotal) as receita')
            ->groupBy('produtos.id', 'produtos.nome')
            ->orderByDesc('total_vendido')
            ->limit($limite)
            ->get();

        return response()->json($produtos);
    }

    public function financeiro(Request $request): JsonResponse
    {
        $inicio = $request->input('inicio', now()->startOfMonth()->toDateString());
        $fim = $request->input('fim', now()->toDateString());

        $receita = Pedido::where('status', Pedido::STATUS_ENTREGUE)
            ->whereBetween(DB::raw('DATE(updated_at)'), [$inicio, $fim])
            ->sum('total');

        $pedidosCancelados = Pedido::where('status', Pedido::STATUS_CANCELADO)
            ->whereBetween(DB::raw('DATE(updated_at)'), [$inicio, $fim])
            ->count();

        $ticketMedio = Pedido::where('status', Pedido::STATUS_ENTREGUE)
            ->whereBetween(DB::raw('DATE(updated_at)'), [$inicio, $fim])
            ->avg('total');

        return response()->json([
            'periodo' => ['inicio' => $inicio, 'fim' => $fim],
            'receita_total' => round($receita, 2),
            'ticket_medio' => round($ticketMedio ?? 0, 2),
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
                'alerta' => $e->estaBaixo(),
            ]);

        return response()->json($estoques);
    }
}

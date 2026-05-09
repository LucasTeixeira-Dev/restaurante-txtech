<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Caixa;
use App\Models\Estoque;
use App\Models\Mesa;
use App\Models\Pedido;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(): JsonResponse
    {
        $hoje = now()->toDateString();

        $pedidosHoje = Pedido::whereDate('created_at', $hoje)->count();
        $receitaHoje = Pedido::where('status', Pedido::STATUS_ENTREGUE)
            ->whereDate('updated_at', $hoje)
            ->sum('total');
        $pedidosAtivos = Pedido::whereIn('status', ['aberto', 'em_preparo', 'pronto'])->count();
        $mesasOcupadas = Mesa::where('status', 'ocupada')->count();
        $mesasTotal = Mesa::count();
        $estoqueBaixo = Estoque::whereColumn('quantidade', '<=', 'quantidade_minima')->count();

        $caixaAberto = Caixa::aberto()->latest('aberto_em')->first();

        // Vendas dos últimos 7 dias
        $vendasSemana = Pedido::where('status', Pedido::STATUS_ENTREGUE)
            ->whereBetween(DB::raw('DATE(updated_at)'), [now()->subDays(6)->toDateString(), $hoje])
            ->selectRaw('DATE(updated_at) as data, COUNT(*) as pedidos, SUM(total) as receita')
            ->groupBy('data')
            ->orderBy('data')
            ->get();

        // Top 5 produtos do dia
        $topProdutos = DB::table('itens_pedido')
            ->join('pedidos', 'itens_pedido.pedido_id', '=', 'pedidos.id')
            ->join('produtos', 'itens_pedido.produto_id', '=', 'produtos.id')
            ->where('pedidos.status', Pedido::STATUS_ENTREGUE)
            ->whereDate('pedidos.updated_at', $hoje)
            ->selectRaw('produtos.nome, SUM(itens_pedido.quantidade) as total_vendido')
            ->groupBy('produtos.id', 'produtos.nome')
            ->orderByDesc('total_vendido')
            ->limit(5)
            ->get();

        // Pedidos por status (ativos)
        $pedidosPorStatus = Pedido::whereIn('status', ['aberto', 'em_preparo', 'pronto'])
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return response()->json([
            'kpis' => [
                'pedidos_hoje' => $pedidosHoje,
                'receita_hoje' => round((float) $receitaHoje, 2),
                'pedidos_ativos' => $pedidosAtivos,
                'mesas_ocupadas' => $mesasOcupadas,
                'mesas_total' => $mesasTotal,
                'estoque_baixo' => $estoqueBaixo,
                'caixa_aberto' => $caixaAberto ? true : false,
                'saldo_inicial_caixa' => $caixaAberto ? (float) $caixaAberto->saldo_inicial : null,
            ],
            'vendas_semana' => $vendasSemana,
            'top_produtos' => $topProdutos,
            'pedidos_por_status' => $pedidosPorStatus,
        ]);
    }
}

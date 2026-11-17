<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Caixa;
use App\Models\Conta;
use App\Models\Estoque;
use App\Models\Mesa;
use App\Models\Pagamento;
use App\Models\Pedido;
use App\Services\ResumoVendas;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /** Só estes papéis recebem valores financeiros (receita e saldo do caixa). */
    private const PAPEIS_FINANCEIRO = ['gerente', 'caixa'];

    public function index(Request $request): JsonResponse
    {
        $hoje = now()->toDateString();
        $veFinanceiro = $request->user()->hasAnyRole(self::PAPEIS_FINANCEIRO);

        $pedidosHoje = Pedido::whereDate('created_at', $hoje)->count();
        // Receita = pagamentos aprovados hoje (inclui taxa de serviço e partes de contas divididas).
        $receitaHoje = $veFinanceiro ? Pagamento::aprovados()->whereDate('pago_em', $hoje)->sum('valor') : 0;
        $pedidosAtivos = Pedido::whereIn('status', ['aberto', 'em_preparo', 'pronto'])->count();
        $mesasOcupadas = Mesa::where('status', 'ocupada')->count();
        $mesasTotal = Mesa::count();
        $estoqueBaixo = Estoque::whereColumn('quantidade', '<=', 'quantidade_minima')->count();

        $caixaAberto = Caixa::aberto()->latest('aberto_em')->first();

        // Vendas dos últimos 7 dias (o valor em R$ só vai para quem vê o financeiro)
        $vendasSemana = ResumoVendas::porDia(now()->subDays(6)->toDateString(), $hoje, $veFinanceiro);

        // Salão: mesas que chamaram o garçom ou pediram a conta.
        $mesasChamando = Mesa::whereNotNull('garcom_chamado_em')->count();
        $contasSolicitadas = Conta::where('status', Conta::STATUS_SOLICITADA)->count();

        // Top 5 produtos do dia
        $topProdutos = DB::table('itens_pedido')
            ->join('pedidos', 'itens_pedido.pedido_id', '=', 'pedidos.id')
            ->join('produtos', 'itens_pedido.produto_id', '=', 'produtos.id')
            ->where('pedidos.status', Pedido::STATUS_ENTREGUE)
            ->where('itens_pedido.status', '!=', 'cancelado')
            ->whereDate('pedidos.entregue_em', $hoje)
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
                // null para garçom e chapeiro: o valor não sai da API.
                'receita_hoje' => $veFinanceiro ? round((float) $receitaHoje, 2) : null,
                'pedidos_ativos' => $pedidosAtivos,
                'mesas_ocupadas' => $mesasOcupadas,
                'mesas_total' => $mesasTotal,
                'estoque_baixo' => $estoqueBaixo,
                'caixa_aberto' => $caixaAberto ? true : false,
                'mesas_chamando' => $mesasChamando,
                'contas_solicitadas' => $contasSolicitadas,
                'saldo_inicial_caixa' => $veFinanceiro && $caixaAberto ? (float) $caixaAberto->saldo_inicial : null,
            ],
            'vendas_semana' => $vendasSemana,
            'top_produtos' => $topProdutos,
            'pedidos_por_status' => $pedidosPorStatus,
        ]);
    }
}

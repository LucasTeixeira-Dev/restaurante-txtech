<?php

namespace App\Services;

use App\Models\Pagamento;
use App\Models\Pedido;
use Illuminate\Support\Facades\DB;

/**
 * Vendas por dia: quantidade de pedidos entregues (consumo) e receita das contas pagas
 * (dinheiro que entrou, com taxa de serviço), cada um na sua data.
 */
class ResumoVendas
{
    /**
     * @return array<int, array{data:string, pedidos:int, receita?:float}>
     */
    public static function porDia(string $inicio, string $fim, bool $comReceita = true): array
    {
        $pedidos = Pedido::where('status', Pedido::STATUS_ENTREGUE)
            ->whereBetween(DB::raw('DATE(entregue_em)'), [$inicio, $fim])
            ->selectRaw('DATE(entregue_em) as data, COUNT(*) as pedidos')
            ->groupBy('data')
            ->pluck('pedidos', 'data');

        // Receita = pagamentos aprovados no dia (inclui partes de contas divididas e taxa de serviço).
        $receitas = $comReceita
            ? Pagamento::aprovados()
                ->whereBetween(DB::raw('DATE(pago_em)'), [$inicio, $fim])
                ->selectRaw('DATE(pago_em) as data, SUM(valor) as receita')
                ->groupBy('data')
                ->pluck('receita', 'data')
            : collect();

        return $pedidos->keys()
            ->merge($receitas->keys())
            ->unique()
            ->sort()
            ->values()
            ->map(function ($data) use ($pedidos, $receitas, $comReceita) {
                $linha = ['data' => $data, 'pedidos' => (int) ($pedidos[$data] ?? 0)];
                if ($comReceita) {
                    $linha['receita'] = round((float) ($receitas[$data] ?? 0), 2);
                }

                return $linha;
            })
            ->all();
    }
}

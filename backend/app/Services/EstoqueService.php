<?php

namespace App\Services;

use App\Models\Estoque;
use App\Models\EstoqueMovimentacao;
use App\Models\ItemPedido;
use App\Models\Produto;
use App\Models\Usuario;
use Illuminate\Validation\ValidationException;

/**
 * Baixa e devolução automáticas de estoque ligadas a pedidos.
 * Só atua em produtos com controla_estoque; chamar dentro de uma transação.
 */
class EstoqueService
{
    const REFERENCIA_PEDIDO = 'pedido';

    /** Debita o item do estoque; recusa (422) se a quantidade disponível não cobrir. */
    public function debitarItem(ItemPedido $item, Produto $produto, ?Usuario $usuario): void
    {
        if (!$produto->controla_estoque) {
            return;
        }

        $estoque = Estoque::where('produto_id', $produto->id)->lockForUpdate()->first();
        $disponivel = $estoque ? (float) $estoque->quantidade : 0.0;

        if ($disponivel < $item->quantidade) {
            throw ValidationException::withMessages([
                'itens' => "Estoque insuficiente para {$produto->nome} (disponível: {$this->formatar($disponivel)}).",
            ]);
        }

        $this->registrar(
            $estoque,
            EstoqueMovimentacao::TIPO_SAIDA,
            $item->quantidade,
            $usuario,
            "Pedido #{$item->pedido_id}",
            $item->pedido_id,
        );
    }

    /** Devolve ao estoque a quantidade do item, se ela foi debitada por este pedido. */
    public function devolverItem(ItemPedido $item, ?Usuario $usuario, string $motivo): void
    {
        $produto = $item->produto;
        if (!$produto?->controla_estoque) {
            return;
        }

        // Evita devolver o que nunca saiu (ex.: controla_estoque ligado depois do pedido).
        $foiDebitado = EstoqueMovimentacao::where('produto_id', $produto->id)
            ->where('referencia_tipo', self::REFERENCIA_PEDIDO)
            ->where('referencia_id', $item->pedido_id)
            ->where('tipo', EstoqueMovimentacao::TIPO_SAIDA)
            ->exists();

        $estoque = Estoque::where('produto_id', $produto->id)->lockForUpdate()->first();
        if (!$foiDebitado || !$estoque) {
            return;
        }

        $this->registrar(
            $estoque,
            EstoqueMovimentacao::TIPO_ENTRADA,
            $item->quantidade,
            $usuario,
            "{$motivo} #{$item->pedido_id}",
            $item->pedido_id,
        );
    }

    private function registrar(
        Estoque $estoque,
        string $tipo,
        float $quantidade,
        ?Usuario $usuario,
        string $motivo,
        int $pedidoId,
    ): void {
        $anterior = (float) $estoque->quantidade;
        $posterior = $tipo === EstoqueMovimentacao::TIPO_SAIDA
            ? $anterior - $quantidade
            : $anterior + $quantidade;

        $estoque->update(['quantidade' => $posterior]);

        EstoqueMovimentacao::create([
            'produto_id' => $estoque->produto_id,
            'usuario_id' => $usuario?->id,
            'tipo' => $tipo,
            'quantidade' => $quantidade,
            'quantidade_anterior' => $anterior,
            'quantidade_posterior' => $posterior,
            'motivo' => $motivo,
            'referencia_id' => $pedidoId,
            'referencia_tipo' => self::REFERENCIA_PEDIDO,
        ]);
    }

    private function formatar(float $valor): string
    {
        return rtrim(rtrim(number_format($valor, 3, ',', '.'), '0'), ',');
    }
}

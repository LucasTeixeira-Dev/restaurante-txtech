<?php

namespace App\Services;

use App\Models\ItemPedido;
use App\Models\Mesa;
use App\Models\Pedido;
use App\Models\Produto;
use App\Models\Usuario;
use Illuminate\Validation\ValidationException;

/**
 * Regras de negócio do pedido: itens, transições de status, cancelamento e estoque.
 * Os métodos esperam ser chamados dentro de uma transação (DB::transaction no controller).
 */
class PedidoService
{
    public function __construct(
        private readonly EstoqueService $estoque,
        private readonly ContaService $contas,
    ) {
    }

    /**
     * Cria um pedido (do garçom ou do tablet da mesa) dentro da conta em aberto da mesa.
     *
     * @param  array<int, array{produto_id:int, quantidade:int, observacoes?:string|null}>  $itens
     */
    public function criarPedido(?int $mesaId, array $itens, ?string $observacoes, Usuario $usuario): Pedido
    {
        $mesa = $mesaId ? Mesa::lockForUpdate()->find($mesaId) : null;
        $conta = $this->contas->contaParaNovoPedido($mesa);

        $pedido = Pedido::create([
            'mesa_id' => $mesa?->id,
            'conta_id' => $conta->id,
            'usuario_id' => $usuario->id,
            'status' => Pedido::STATUS_ABERTO,
            'observacoes' => $observacoes,
        ]);

        $this->adicionarItens($pedido, $itens, $usuario);

        return $pedido;
    }

    /**
     * Adiciona itens ao pedido com o preço atual do produto e debita o estoque.
     *
     * @param  array<int, array{produto_id:int, quantidade:int, observacoes?:string|null}>  $itens
     */
    public function adicionarItens(Pedido $pedido, array $itens, ?Usuario $usuario): void
    {
        if ($pedido->isEncerrado()) {
            throw ValidationException::withMessages([
                'pedido' => 'Não é possível adicionar itens a um pedido entregue ou cancelado.',
            ]);
        }

        $produtos = Produto::with('categoria')
            ->whereIn('id', array_column($itens, 'produto_id'))
            ->get()
            ->keyBy('id');

        $erros = [];
        foreach ($itens as $i => $dados) {
            $produto = $produtos->get($dados['produto_id']);
            if (!$produto) {
                $erros["itens.$i.produto_id"] = 'Produto não encontrado.';
            } elseif (!$produto->disponivel) {
                $erros["itens.$i.produto_id"] = "{$produto->nome} está indisponível.";
            }
        }
        if ($erros) {
            throw ValidationException::withMessages($erros);
        }

        foreach ($itens as $dados) {
            $produto = $produtos->get($dados['produto_id']);
            $item = $pedido->itens()->create([
                'produto_id' => $produto->id,
                'quantidade' => $dados['quantidade'],
                'preco_unitario' => $produto->preco,
                'status' => ItemPedido::STATUS_PENDENTE,
                // Cópia do setor da categoria: define em qual KDS (cozinha ou bar) o item aparece.
                'setor' => $produto->categoria?->setor ?? ItemPedido::SETOR_COZINHA,
                'observacoes' => $dados['observacoes'] ?? null,
            ]);
            $this->estoque->debitarItem($item, $produto, $usuario);
        }

        // Pedir mais depois de pedir a conta reabre a conta.
        $this->contas->reabrirSeSolicitada($pedido->conta);
        $this->sincronizarStatus($pedido);
    }

    /** Remove um item ainda pendente (não chegou à cozinha) e devolve o estoque. */
    public function removerItem(Pedido $pedido, ItemPedido $item, ?Usuario $usuario): void
    {
        $this->garantirItemDoPedido($pedido, $item);
        $this->garantirPedidoAtivo($pedido);

        if ($item->status !== ItemPedido::STATUS_PENDENTE) {
            throw ValidationException::withMessages([
                'item' => 'Só itens pendentes podem ser removidos; itens em preparo devem ser cancelados.',
            ]);
        }

        $outrosAtivos = $pedido->itens()
            ->where('id', '!=', $item->id)
            ->where('status', '!=', ItemPedido::STATUS_CANCELADO)
            ->exists();
        if (!$outrosAtivos) {
            throw ValidationException::withMessages([
                'item' => 'O pedido precisa de pelo menos um item. Para desistir de tudo, cancele o pedido.',
            ]);
        }

        $this->estoque->devolverItem($item, $usuario, 'Item removido do pedido');
        $item->delete();

        $this->sincronizarStatus($pedido);
    }

    /** Muda o status do pedido validando a transição e o papel de quem pede. */
    public function alterarStatus(Pedido $pedido, string $novo, Usuario $usuario): void
    {
        // Papel antes da transição: quem nunca pode (ex.: chapeiro entregando) recebe 403, não 422.
        // Status fora do mapa (ex.: voltar para "aberto") não é destino manual: cai no 422 abaixo.
        $papeis = Pedido::PAPEIS_POR_STATUS[$novo] ?? null;
        if ($papeis !== null && !$usuario->hasAnyRole($papeis)) {
            abort(403, 'Seu papel não pode levar o pedido para este status.');
        }

        if (!$pedido->podeIrPara($novo)) {
            throw ValidationException::withMessages([
                'status' => "Não é possível mudar o pedido de \"{$pedido->status}\" para \"{$novo}\".",
            ]);
        }

        if (in_array($novo, [Pedido::STATUS_EM_PREPARO, Pedido::STATUS_PRONTO], true)) {
            // Avanço manual arrasta os itens junto. Chapeiro e bar só movem os do próprio setor;
            // o status final do pedido sai dos itens (ex.: cozinha pronta, bar ainda preparando).
            $origem = $novo === Pedido::STATUS_EM_PREPARO
                ? [ItemPedido::STATUS_PENDENTE]
                : [ItemPedido::STATUS_PENDENTE, ItemPedido::STATUS_EM_PREPARO];

            $pedido->itens()
                ->whereIn('status', $origem)
                ->when($usuario->setorDePreparo(), fn ($q, $setor) => $q->where('setor', $setor))
                ->update(['status' => $novo]);

            $this->sincronizarStatus($pedido);

            return;
        }

        if ($novo === Pedido::STATUS_CANCELADO) {
            $this->cancelarItens($pedido, $usuario);
        }

        $pedido->status = $novo;
        if ($novo === Pedido::STATUS_ENTREGUE) {
            $pedido->entregue_em = now();
        }
        $pedido->save();

        // A mesa só é liberada no pagamento da conta; um pedido cancelado só fecha a conta
        // (e libera a mesa) se ela não tiver mais nenhum pedido válido.
        if ($novo === Pedido::STATUS_CANCELADO) {
            $this->contas->cancelarSeVazia($pedido->conta);
        }
    }

    /**
     * Muda o status de um item e recalcula o status do pedido.
     *
     * @return bool true se o status do pedido mudou junto
     */
    public function alterarStatusItem(Pedido $pedido, ItemPedido $item, string $novo, ?Usuario $usuario): bool
    {
        $this->garantirItemDoPedido($pedido, $item);
        $this->garantirPedidoAtivo($pedido);

        $setor = $usuario?->setorDePreparo();
        if ($setor && $item->setor !== $setor) {
            abort(403, $setor === ItemPedido::SETOR_BAR
                ? 'Este item é preparado pela cozinha.'
                : 'Este item é preparado pelo bar.');
        }

        if (!in_array($novo, ItemPedido::TRANSICOES[$item->status] ?? [], true)) {
            throw ValidationException::withMessages([
                'status' => "Não é possível mudar o item de \"{$item->status}\" para \"{$novo}\".",
            ]);
        }

        if ($novo === ItemPedido::STATUS_CANCELADO) {
            $outrosAtivos = $pedido->itens()
                ->where('id', '!=', $item->id)
                ->where('status', '!=', ItemPedido::STATUS_CANCELADO)
                ->exists();
            if (!$outrosAtivos) {
                throw ValidationException::withMessages([
                    'status' => 'Este é o último item ativo. Para desistir de tudo, cancele o pedido.',
                ]);
            }
            $this->estoque->devolverItem($item, $usuario, 'Item cancelado no pedido');
        }

        $item->update(['status' => $novo]);

        return $this->sincronizarStatus($pedido);
    }

    /**
     * Deriva o status do pedido a partir dos itens ativos:
     * todos prontos -> pronto; algum em preparo ou pronto -> em_preparo; todos pendentes -> aberto.
     *
     * @return bool true se o status mudou
     */
    public function sincronizarStatus(Pedido $pedido): bool
    {
        $pedido->refresh();
        if ($pedido->isEncerrado()) {
            return false;
        }

        $ativos = $pedido->itens()
            ->where('status', '!=', ItemPedido::STATUS_CANCELADO)
            ->pluck('status');
        if ($ativos->isEmpty()) {
            return false;
        }

        $novo = match (true) {
            $ativos->every(fn ($s) => $s === ItemPedido::STATUS_PRONTO) => Pedido::STATUS_PRONTO,
            $ativos->contains(fn ($s) => $s !== ItemPedido::STATUS_PENDENTE) => Pedido::STATUS_EM_PREPARO,
            default => Pedido::STATUS_ABERTO,
        };

        if ($novo === $pedido->status) {
            return false;
        }

        $pedido->update(['status' => $novo]);

        return true;
    }

    private function cancelarItens(Pedido $pedido, ?Usuario $usuario): void
    {
        $ativos = $pedido->itens()
            ->with('produto')
            ->where('status', '!=', ItemPedido::STATUS_CANCELADO)
            ->get();

        foreach ($ativos as $item) {
            $this->estoque->devolverItem($item, $usuario, 'Cancelamento do pedido');
        }

        $pedido->itens()
            ->where('status', '!=', ItemPedido::STATUS_CANCELADO)
            ->update(['status' => ItemPedido::STATUS_CANCELADO]);
    }

    private function garantirItemDoPedido(Pedido $pedido, ItemPedido $item): void
    {
        if ((int) $item->pedido_id !== (int) $pedido->id) {
            abort(404, 'Item não pertence a este pedido.');
        }
    }

    private function garantirPedidoAtivo(Pedido $pedido): void
    {
        if ($pedido->isEncerrado()) {
            throw ValidationException::withMessages([
                'pedido' => 'O pedido já foi entregue ou cancelado.',
            ]);
        }
    }
}

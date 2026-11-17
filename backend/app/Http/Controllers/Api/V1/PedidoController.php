<?php

namespace App\Http\Controllers\Api\V1;

use App\Events\ContaAtualizada;
use App\Events\ItemPedidoStatusAtualizado;
use App\Events\PedidoCriado;
use App\Events\PedidoStatusAtualizado;
use App\Http\Controllers\Controller;
use App\Http\Requests\Pedido\AdicionarItensRequest;
use App\Http\Requests\Pedido\StorePedidoRequest;
use App\Http\Resources\PedidoResource;
use App\Models\ItemPedido;
use App\Models\Pedido;
use App\Services\PedidoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PedidoController extends Controller
{
    private const RELACOES = ['mesa', 'usuario', 'itens.produto'];

    public function __construct(private readonly PedidoService $pedidos)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $pedidos = Pedido::with(self::RELACOES)
            ->when($request->filled('status'), fn($q) => $q->where('status', $request->status))
            ->when($request->filled('mesa_id'), fn($q) => $q->where('mesa_id', $request->mesa_id))
            ->orderByDesc('created_at')
            ->paginate($request->input('per_page', 20));

        return response()->json(PedidoResource::collection($pedidos)->response()->getData(true));
    }

    public function store(StorePedidoRequest $request): JsonResponse
    {
        $pedido = DB::transaction(fn () => $this->pedidos->criarPedido(
            $request->mesa_id,
            $request->itens,
            $request->observacoes,
            $request->user(),
        ));

        $pedido->refresh()->load(self::RELACOES);
        broadcast(new PedidoCriado($pedido))->toOthers();
        $this->notificarConta($pedido);

        return response()->json(new PedidoResource($pedido), 201);
    }

    public function show(Pedido $pedido): JsonResponse
    {
        return response()->json(new PedidoResource($pedido->load(self::RELACOES)));
    }

    public function atualizarStatus(Request $request, Pedido $pedido): JsonResponse
    {
        $request->validate([
            'status' => ['required', 'in:' . implode(',', Pedido::statusPermitidos())],
        ], [
            'status.required' => 'O status é obrigatório.',
            'status.in' => 'Status inválido.',
        ]);

        DB::transaction(function () use ($request, $pedido) {
            $bloqueado = Pedido::lockForUpdate()->findOrFail($pedido->id);
            $this->pedidos->alterarStatus($bloqueado, $request->status, $request->user());
        });

        $pedido->refresh();
        broadcast(new PedidoStatusAtualizado($pedido))->toOthers();
        $this->notificarConta($pedido);

        return response()->json(new PedidoResource($pedido->load(self::RELACOES)));
    }

    public function adicionarItens(AdicionarItensRequest $request, Pedido $pedido): JsonResponse
    {
        DB::transaction(function () use ($request, $pedido) {
            $bloqueado = Pedido::lockForUpdate()->findOrFail($pedido->id);
            $this->pedidos->adicionarItens($bloqueado, $request->itens, $request->user());
        });

        $pedido->refresh();
        broadcast(new PedidoStatusAtualizado($pedido))->toOthers();
        $this->notificarConta($pedido);

        return response()->json(new PedidoResource($pedido->load(self::RELACOES)), 201);
    }

    public function removerItem(Request $request, Pedido $pedido, ItemPedido $item): JsonResponse
    {
        DB::transaction(function () use ($request, $pedido, $item) {
            $bloqueado = Pedido::lockForUpdate()->findOrFail($pedido->id);
            $this->pedidos->removerItem($bloqueado, $item, $request->user());
        });

        $pedido->refresh();
        broadcast(new PedidoStatusAtualizado($pedido))->toOthers();
        $this->notificarConta($pedido);

        return response()->json(new PedidoResource($pedido->load(self::RELACOES)));
    }

    public function atualizarStatusItem(Request $request, Pedido $pedido, ItemPedido $item): JsonResponse
    {
        $request->validate([
            'status' => ['required', 'in:pendente,em_preparo,pronto,cancelado'],
        ], [
            'status.required' => 'O status é obrigatório.',
            'status.in' => 'Status inválido.',
        ]);

        $pedidoMudou = DB::transaction(function () use ($request, $pedido, $item) {
            $bloqueado = Pedido::lockForUpdate()->findOrFail($pedido->id);

            return $this->pedidos->alterarStatusItem($bloqueado, $item, $request->status, $request->user());
        });

        $item->refresh();
        broadcast(new ItemPedidoStatusAtualizado($item))->toOthers();
        if ($pedidoMudou) {
            broadcast(new PedidoStatusAtualizado($pedido->refresh()))->toOthers();
        }

        return response()->json(['message' => 'Status do item atualizado.', 'item' => $item]);
    }

    /** Cancela o pedido (mesma regra do status "cancelado"). */
    public function destroy(Request $request, Pedido $pedido): JsonResponse
    {
        DB::transaction(function () use ($request, $pedido) {
            $bloqueado = Pedido::lockForUpdate()->findOrFail($pedido->id);
            $this->pedidos->alterarStatus($bloqueado, Pedido::STATUS_CANCELADO, $request->user());
        });

        broadcast(new PedidoStatusAtualizado($pedido->refresh()))->toOthers();
        $this->notificarConta($pedido);

        return response()->json(['message' => 'Pedido cancelado com sucesso.']);
    }

    /** Caixa e salão acompanham o valor e o estado da conta em tempo real. */
    private function notificarConta(Pedido $pedido): void
    {
        $conta = $pedido->conta()->first();
        if ($conta) {
            broadcast(new ContaAtualizada($conta))->toOthers();
        }
    }
}

<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Pedido\StorePedidoRequest;
use App\Http\Resources\PedidoResource;
use App\Models\ItemPedido;
use App\Models\Mesa;
use App\Models\Pedido;
use App\Models\Produto;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PedidoController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $pedidos = Pedido::with(['mesa', 'usuario', 'itens.produto'])
            ->when($request->filled('status'), fn($q) => $q->where('status', $request->status))
            ->when($request->filled('mesa_id'), fn($q) => $q->where('mesa_id', $request->mesa_id))
            ->orderByDesc('created_at')
            ->paginate($request->input('per_page', 20));

        return response()->json(PedidoResource::collection($pedidos)->response()->getData(true));
    }

    public function store(StorePedidoRequest $request): JsonResponse
    {
        return DB::transaction(function () use ($request) {
            $pedido = Pedido::create([
                'mesa_id' => $request->mesa_id,
                'usuario_id' => $request->user()->id,
                'status' => Pedido::STATUS_ABERTO,
                'observacoes' => $request->observacoes,
            ]);

            foreach ($request->itens as $itemData) {
                $produto = Produto::findOrFail($itemData['produto_id']);
                ItemPedido::create([
                    'pedido_id' => $pedido->id,
                    'produto_id' => $produto->id,
                    'quantidade' => $itemData['quantidade'],
                    'preco_unitario' => $produto->preco,
                    'subtotal' => $itemData['quantidade'] * $produto->preco,
                    'observacoes' => $itemData['observacoes'] ?? null,
                ]);
            }

            if ($request->filled('mesa_id')) {
                Mesa::find($request->mesa_id)?->update(['status' => Mesa::STATUS_OCUPADA]);
            }

            $pedido->recalcularTotal();

            return response()->json(new PedidoResource($pedido->load(['mesa', 'usuario', 'itens.produto'])), 201);
        });
    }

    public function show(Pedido $pedido): JsonResponse
    {
        return response()->json(new PedidoResource($pedido->load(['mesa', 'usuario', 'itens.produto'])));
    }

    public function atualizarStatus(Request $request, Pedido $pedido): JsonResponse
    {
        $request->validate([
            'status' => ['required', 'in:' . implode(',', Pedido::statusPermitidos())],
        ], [
            'status.required' => 'O status é obrigatório.',
            'status.in' => 'Status inválido.',
        ]);

        $pedido->update(['status' => $request->status]);

        if ($request->status === Pedido::STATUS_ENTREGUE && $pedido->mesa_id) {
            Mesa::find($pedido->mesa_id)?->update(['status' => Mesa::STATUS_LIVRE]);
        }

        return response()->json(new PedidoResource($pedido->load(['mesa', 'usuario', 'itens.produto'])));
    }

    public function atualizarStatusItem(Request $request, Pedido $pedido, ItemPedido $item): JsonResponse
    {
        $request->validate([
            'status' => ['required', 'in:pendente,em_preparo,pronto,cancelado'],
        ], [
            'status.required' => 'O status é obrigatório.',
            'status.in' => 'Status inválido.',
        ]);

        $item->update(['status' => $request->status]);

        return response()->json(['message' => 'Status do item atualizado.', 'item' => $item]);
    }

    public function destroy(Pedido $pedido): JsonResponse
    {
        if (!$pedido->isAberto()) {
            return response()->json(['message' => 'Apenas pedidos abertos podem ser cancelados.'], 422);
        }

        $pedido->update(['status' => Pedido::STATUS_CANCELADO]);

        return response()->json(['message' => 'Pedido cancelado com sucesso.']);
    }
}

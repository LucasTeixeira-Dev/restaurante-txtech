<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Mesa\StoreMesaRequest;
use App\Http\Requests\Mesa\UpdateMesaRequest;
use App\Http\Resources\MesaResource;
use App\Models\Mesa;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MesaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $mesas = Mesa::with('pedidoAtivo')
            ->when($request->filled('status'), fn($q) => $q->where('status', $request->status))
            ->orderBy('numero')
            ->get();

        return response()->json(MesaResource::collection($mesas));
    }

    public function store(StoreMesaRequest $request): JsonResponse
    {
        $mesa = Mesa::create($request->validated());

        return response()->json(new MesaResource($mesa), 201);
    }

    public function show(Mesa $mesa): JsonResponse
    {
        return response()->json(new MesaResource($mesa->load('pedidoAtivo')));
    }

    public function update(UpdateMesaRequest $request, Mesa $mesa): JsonResponse
    {
        $mesa->update($request->validated());

        return response()->json(new MesaResource($mesa));
    }

    public function destroy(Mesa $mesa): JsonResponse
    {
        $mesa->delete();

        return response()->json(['message' => 'Mesa removida com sucesso.']);
    }

    public function buscarPorQr(string $token): JsonResponse
    {
        $mesa = Mesa::with('pedidoAtivo')->where('qr_code_token', $token)->firstOrFail();

        return response()->json(new MesaResource($mesa));
    }

    public function atualizarStatus(Request $request, Mesa $mesa): JsonResponse
    {
        $request->validate([
            'status' => ['required', 'in:livre,ocupada,reservada'],
        ], [
            'status.required' => 'O status é obrigatório.',
            'status.in' => 'Status inválido. Use: livre, ocupada ou reservada.',
        ]);

        $mesa->update(['status' => $request->status]);

        return response()->json(new MesaResource($mesa));
    }
}

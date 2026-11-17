<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Usuario\StoreUsuarioRequest;
use App\Http\Requests\Usuario\UpdateUsuarioRequest;
use App\Http\Resources\UsuarioResource;
use App\Models\Usuario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UsuarioController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $usuarios = Usuario::with('roles')
            // Logins de tablet (papel "mesa") são gerenciados na tela de Mesas.
            ->whereDoesntHave('roles', fn($q) => $q->where('name', 'mesa'))
            // Agrupado: sem o closure, o orWhere anulava os demais filtros (ex.: papel).
            ->when($request->filled('search'), fn($q) => $q->where(fn($b) => $b
                ->where('nome', 'like', "%{$request->search}%")
                ->orWhere('email', 'like', "%{$request->search}%")))
            ->when($request->filled('papel'), fn($q) => $q->role($request->papel))
            ->orderBy('nome')
            ->paginate($request->input('per_page', 15));

        return response()->json(UsuarioResource::collection($usuarios)->response()->getData(true));
    }

    public function store(StoreUsuarioRequest $request): JsonResponse
    {
        $usuario = Usuario::create([
            'nome' => $request->nome,
            'email' => $request->email,
            'senha' => Hash::make($request->senha),
            'ativo' => $request->input('ativo', true),
        ]);

        $usuario->assignRole($request->papel);

        return response()->json(new UsuarioResource($usuario->load('roles')), 201);
    }

    public function show(Usuario $usuario): JsonResponse
    {
        return response()->json(new UsuarioResource($usuario->load('roles')));
    }

    public function update(UpdateUsuarioRequest $request, Usuario $usuario): JsonResponse
    {
        $dados = $request->only(['nome', 'email', 'ativo']);

        if ($request->filled('senha')) {
            $dados['senha'] = Hash::make($request->senha);
        }

        $usuario->update($dados);

        if ($request->filled('papel')) {
            $usuario->syncRoles([$request->papel]);
        }

        return response()->json(new UsuarioResource($usuario->load('roles')));
    }

    public function destroy(Usuario $usuario): JsonResponse
    {
        $usuario->delete();

        return response()->json(['message' => 'Usuário removido com sucesso.']);
    }
}

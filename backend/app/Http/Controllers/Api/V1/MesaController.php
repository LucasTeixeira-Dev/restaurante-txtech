<?php

namespace App\Http\Controllers\Api\V1;

use App\Events\ChamadoGarcomAtualizado;
use App\Http\Controllers\Controller;
use App\Http\Requests\Mesa\StoreMesaRequest;
use App\Http\Requests\Mesa\UpdateMesaRequest;
use App\Http\Resources\MesaResource;
use App\Models\Mesa;
use App\Models\Usuario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class MesaController extends Controller
{
    private const RELACOES = ['pedidoAtivo', 'contaEmAberto.pedidos', 'contaEmAberto.pagamentos', 'usuarioAutoatendimento'];

    public function index(Request $request): JsonResponse
    {
        $mesas = Mesa::with(self::RELACOES)
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
        return response()->json(new MesaResource($mesa->load(self::RELACOES)));
    }

    public function update(UpdateMesaRequest $request, Mesa $mesa): JsonResponse
    {
        if ($request->input('status') === Mesa::STATUS_LIVRE) {
            $this->garantirSemContaAberta($mesa, 'liberar');
        }

        $mesa->update($request->validated());

        return response()->json(new MesaResource($mesa->load(self::RELACOES)));
    }

    public function destroy(Mesa $mesa): JsonResponse
    {
        $this->garantirSemContaAberta($mesa, 'remover');

        DB::transaction(function () use ($mesa) {
            $mesa->usuarioAutoatendimento?->tokens()->delete();
            $mesa->usuarioAutoatendimento?->update(['ativo' => false, 'mesa_id' => null]);
            $mesa->delete();
        });

        return response()->json(['message' => 'Mesa removida com sucesso.']);
    }

    public function buscarPorQr(string $token): JsonResponse
    {
        $mesa = Mesa::with(self::RELACOES)->where('qr_code_token', $token)->firstOrFail();

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

        if ($request->status === Mesa::STATUS_LIVRE) {
            $this->garantirSemContaAberta($mesa, 'liberar');
        }

        $mesa->update(['status' => $request->status]);

        return response()->json(new MesaResource($mesa->load(self::RELACOES)));
    }

    /**
     * Liga/desliga o tablet de autoatendimento da mesa (gerente).
     * Ligar cria (ou reativa) o usuário mesaN@<dominio> com papel "mesa"; desligar bloqueia o login
     * e derruba as sessões abertas no tablet.
     */
    public function configurarAutoatendimento(Request $request, Mesa $mesa): JsonResponse
    {
        $request->validate([
            'ativo' => ['required', 'boolean'],
            'senha' => ['nullable', 'string', 'min:6'],
        ], [
            'senha.min' => 'A senha deve ter no mínimo 6 caracteres.',
        ]);

        DB::transaction(function () use ($request, $mesa) {
            $usuario = $mesa->usuarioAutoatendimento;

            if (!$request->boolean('ativo')) {
                if ($usuario) {
                    $usuario->update(['ativo' => false]);
                    $usuario->tokens()->delete();
                }

                return;
            }

            if (!$usuario && !$request->filled('senha')) {
                throw ValidationException::withMessages(['senha' => 'Defina uma senha para o tablet desta mesa.']);
            }

            if (!$usuario) {
                $email = "mesa{$mesa->numero}@" . config('restaurante.dominio_login_mesa');
                // Login de uma mesa removida com o mesmo número: reaproveita o registro.
                $usuario = Usuario::withTrashed()->where('email', $email)->first()
                    ?? new Usuario(['email' => $email]);
                if ($usuario->trashed()) {
                    $usuario->restore();
                }
            }

            $usuario->fill([
                'nome' => "Mesa {$mesa->numero}",
                'ativo' => true,
                'mesa_id' => $mesa->id,
            ]);
            if ($request->filled('senha')) {
                $usuario->senha = Hash::make($request->senha);
                // Senha nova: tablets com a senha antiga precisam entrar de novo.
                $usuario->exists && $usuario->tokens()->delete();
            }
            $usuario->save();
            $usuario->syncRoles(['mesa']);
        });

        return response()->json(new MesaResource($mesa->fresh()->load(self::RELACOES)));
    }

    /** Garçom marca o chamado da mesa como atendido. */
    public function atenderChamado(Mesa $mesa): JsonResponse
    {
        $mesa->update(['garcom_chamado_em' => null]);
        broadcast(new ChamadoGarcomAtualizado($mesa))->toOthers();

        return response()->json(new MesaResource($mesa->load(self::RELACOES)));
    }

    private function garantirSemContaAberta(Mesa $mesa, string $acao): void
    {
        if ($mesa->contaEmAberto()->exists()) {
            throw ValidationException::withMessages([
                'mesa' => "Não é possível {$acao} a mesa {$mesa->numero}: ela tem uma conta em aberto. Feche ou cancele a conta antes.",
            ]);
        }
    }
}

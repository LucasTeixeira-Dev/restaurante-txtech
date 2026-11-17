<?php

namespace App\Http\Controllers\Api\V1;

use App\Events\ChamadoGarcomAtualizado;
use App\Events\ContaAtualizada;
use App\Events\PagamentoSolicitado;
use App\Events\PedidoCriado;
use App\Http\Controllers\Controller;
use App\Http\Requests\Pedido\AdicionarItensRequest;
use App\Http\Resources\ContaResource;
use App\Http\Resources\PagamentoResource;
use App\Http\Resources\PedidoResource;
use App\Models\Conta;
use App\Models\Mesa;
use App\Models\Pagamento;
use App\Services\ContaService;
use App\Services\PedidoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Rotas do tablet de autoatendimento (papel "mesa"). A mesa vem sempre do usuário logado:
 * o tablet não consegue pedir, ver nem pagar a conta de outra mesa.
 */
class AutoatendimentoController extends Controller
{
    private const RELACOES_CONTA = ['pedidos.itens.produto', 'pagamentos'];

    public function __construct(
        private readonly PedidoService $pedidos,
        private readonly ContaService $contas,
    ) {
    }

    /** Estado da mesa para o tablet: conta em aberto e, logo depois do pagamento, o comprovante. */
    public function sessao(Request $request): JsonResponse
    {
        $mesa = $this->mesaDoTablet($request);

        $conta = $mesa->contaEmAberto()->first();
        if ($conta) {
            $this->contas->expirarPixVencidos($conta);
            $conta->load(self::RELACOES_CONTA);
        }

        // Comprovante: a conta paga há pouco continua disponível para o tablet mostrar.
        $ultimaPaga = $conta ? null : $mesa->contas()
            ->where('status', Conta::STATUS_PAGA)
            ->where('paga_em', '>=', now()->subMinutes(15))
            ->latest('paga_em')
            ->with(self::RELACOES_CONTA)
            ->first();

        return response()->json([
            'mesa' => ['id' => $mesa->id, 'numero' => $mesa->numero],
            'conta' => $conta ? new ContaResource($conta) : null,
            'ultima_conta_paga' => $ultimaPaga ? new ContaResource($ultimaPaga) : null,
            // Só em desenvolvimento com Pix simulado: o tablet mostra "simular pagamento".
            'pix_simulado' => $this->pixSimulado(),
        ]);
    }

    public function fazerPedido(AdicionarItensRequest $request): JsonResponse
    {
        $request->validate(['observacoes' => ['nullable', 'string', 'max:500']]);
        $mesa = $this->mesaDoTablet($request);

        if ($mesa->contaEmAberto()->where('status', Conta::STATUS_SOLICITADA)->exists()) {
            throw ValidationException::withMessages([
                'conta' => 'Sua conta está em pagamento. Toque em "Voltar ao cardápio" para pedir mais.',
            ]);
        }

        $pedido = DB::transaction(fn () => $this->pedidos->criarPedido(
            $mesa->id,
            $request->itens,
            $request->observacoes,
            $request->user(),
        ));

        $pedido->refresh()->load(['mesa', 'usuario', 'itens.produto']);
        broadcast(new PedidoCriado($pedido))->toOthers();
        if ($pedido->conta) {
            broadcast(new ContaAtualizada($pedido->conta))->toOthers();
        }

        return response()->json(new PedidoResource($pedido), 201);
    }

    /** "Solicitar conta": a conta entra em modo pagamento. */
    public function pedirConta(Request $request): JsonResponse
    {
        return $this->alterarConta($request, fn (Conta $c) => $this->contas->solicitarFechamento($c));
    }

    /** Desiste de fechar agora (só antes do primeiro pagamento). */
    public function voltarAoCardapio(Request $request): JsonResponse
    {
        return $this->alterarConta($request, fn (Conta $c) => $this->contas->voltarAoCardapio($c));
    }

    /** Dividir em N pessoas e incluir ou não a taxa de serviço. */
    public function configurarDivisao(Request $request): JsonResponse
    {
        $dados = $request->validate([
            'pessoas' => ['nullable', 'integer', 'min:1', 'max:20'],
            'cobrar_taxa_servico' => ['nullable', 'boolean'],
        ]);

        return $this->alterarConta($request, fn (Conta $c) => $this->contas->configurarDivisao(
            $c,
            $dados['pessoas'] ?? null,
            array_key_exists('cobrar_taxa_servico', $dados) ? (bool) $dados['cobrar_taxa_servico'] : null,
        ));
    }

    /**
     * Paga uma parte: Pix (devolve o QR), maquininha (avisa a equipe) ou caixa (avisa o caixa).
     */
    public function pagar(Request $request): JsonResponse
    {
        $dados = $request->validate([
            'parte' => ['required', 'integer', 'min:1'],
            'metodo' => ['required', Rule::in([Pagamento::METODO_PIX, Pagamento::METODO_MAQUININHA, Pagamento::METODO_CAIXA])],
        ]);
        $mesa = $this->mesaDoTablet($request);

        $pagamento = DB::transaction(function () use ($mesa, $dados) {
            $conta = $this->contaEmAbertoTravada($mesa);

            return $this->contas->iniciarPagamento($conta, (int) $dados['parte'], $dados['metodo'], 'tablet');
        });

        if ($pagamento->metodo !== Pagamento::METODO_PIX && $pagamento->wasRecentlyCreated) {
            broadcast(new PagamentoSolicitado($pagamento))->toOthers();
        }
        broadcast(new ContaAtualizada($pagamento->conta))->toOthers();

        return response()->json(new PagamentoResource($pagamento->refresh()), 201);
    }

    /** Desenvolvimento: confirma um Pix simulado como se o banco tivesse avisado. */
    public function simularPix(Request $request, Pagamento $pagamento): JsonResponse
    {
        abort_unless($this->pixSimulado(), 404);
        $mesa = $this->mesaDoTablet($request);
        abort_unless((int) $pagamento->conta?->mesa_id === (int) $mesa->id && $pagamento->referencia_externa, 404);

        DB::transaction(fn () => $this->contas->aprovarPix($pagamento->referencia_externa));
        broadcast(new ContaAtualizada($pagamento->conta->refresh()))->toOthers();

        return response()->json(new PagamentoResource($pagamento->refresh()));
    }

    public function chamarGarcom(Request $request): JsonResponse
    {
        $mesa = $this->mesaDoTablet($request);

        // Chamado repetido mantém o horário do primeiro (o salão vê há quanto tempo a mesa espera).
        if (!$mesa->garcom_chamado_em) {
            $mesa->update(['garcom_chamado_em' => now()]);
        }
        broadcast(new ChamadoGarcomAtualizado($mesa))->toOthers();

        return response()->json(['garcom_chamado_em' => $mesa->garcom_chamado_em?->toIso8601String()]);
    }

    private function alterarConta(Request $request, callable $acao): JsonResponse
    {
        $mesa = $this->mesaDoTablet($request);

        $conta = DB::transaction(function () use ($mesa, $acao) {
            $conta = $this->contaEmAbertoTravada($mesa);
            $acao($conta);

            return $conta;
        });

        $conta->refresh();
        broadcast(new ContaAtualizada($conta))->toOthers();

        return response()->json(new ContaResource($conta->load(self::RELACOES_CONTA)));
    }

    private function contaEmAbertoTravada(Mesa $mesa): Conta
    {
        $conta = Conta::emAberto()->where('mesa_id', $mesa->id)->lockForUpdate()->first();
        if (!$conta) {
            throw ValidationException::withMessages(['conta' => 'Esta mesa ainda não fez pedidos.']);
        }

        return $conta;
    }

    private function mesaDoTablet(Request $request): Mesa
    {
        $mesa = $request->user()->mesa;
        if (!$mesa) {
            abort(403, 'Este tablet não está vinculado a nenhuma mesa. Peça ajuda ao gerente.');
        }

        return $mesa;
    }

    private function pixSimulado(): bool
    {
        return config('restaurante.pix.driver') === 'simulado' && app()->environment('local', 'testing');
    }
}

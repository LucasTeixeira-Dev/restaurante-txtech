<?php

namespace App\Http\Controllers\Api\V1;

use App\Events\ContaAtualizada;
use App\Http\Controllers\Controller;
use App\Http\Resources\ContaResource;
use App\Models\Conta;
use App\Models\Pagamento;
use App\Services\ContaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/** Contas para o caixa e o salão: acompanhar, dividir, receber e confirmar pagamentos. */
class ContaController extends Controller
{
    private const RELACOES = ['mesa', 'pedidos.itens.produto', 'pedidos.mesa', 'pedidos.usuario', 'pagamentos'];

    public function __construct(private readonly ContaService $contas)
    {
    }

    /** Contas em aberto (padrão); mesas em modo pagamento primeiro. */
    public function index(Request $request): JsonResponse
    {
        $request->validate(['status' => ['nullable', Rule::in(['em_aberto', 'paga', 'cancelada'])]]);

        $contas = Conta::with(['mesa', 'pedidos', 'pagamentos'])
            ->when(
                $request->input('status', 'em_aberto') === 'em_aberto',
                fn ($q) => $q->emAberto(),
                fn ($q) => $q->where('status', $request->status),
            )
            ->when($request->filled('mesa_id'), fn ($q) => $q->where('mesa_id', $request->mesa_id))
            ->orderByRaw("status = 'fechamento_solicitado' desc")
            ->orderBy('solicitada_em')
            ->orderBy('aberta_em')
            ->limit(200)
            ->get();

        return response()->json(ContaResource::collection($contas));
    }

    /** Detalhe da conta; também serve de comprovante (consumo, divisão e pagamentos). */
    public function show(Conta $conta): JsonResponse
    {
        return response()->json(new ContaResource($conta->load(self::RELACOES)));
    }

    /** Garçom ou caixa coloca a conta em modo pagamento (atendimento manual). */
    public function solicitarFechamento(Conta $conta): JsonResponse
    {
        return $this->alterar($conta, fn (Conta $c) => $this->contas->solicitarFechamento($c));
    }

    public function configurarDivisao(Request $request, Conta $conta): JsonResponse
    {
        $dados = $request->validate([
            'pessoas' => ['nullable', 'integer', 'min:1', 'max:20'],
            'cobrar_taxa_servico' => ['nullable', 'boolean'],
        ]);

        return $this->alterar($conta, fn (Conta $c) => $this->contas->configurarDivisao(
            $c,
            $dados['pessoas'] ?? null,
            array_key_exists('cobrar_taxa_servico', $dados) ? (bool) $dados['cobrar_taxa_servico'] : null,
        ));
    }

    /**
     * Caixa recebe: uma parte (parte), um valor avulso (valor) ou, sem nenhum dos dois, todo o restante.
     * A conta é quitada (e a mesa liberada) quando o total é coberto.
     */
    public function pagar(Request $request, Conta $conta): JsonResponse
    {
        $dados = $request->validate([
            'forma_pagamento' => ['required', Rule::in(Conta::FORMAS_PAGAMENTO)],
            'parte' => ['nullable', 'integer', 'min:1'],
            'valor' => ['nullable', 'numeric', 'min:0.01'],
            'valor_recebido' => ['nullable', 'numeric', 'min:0'],
            // Compatibilidade: tirar a taxa ao receber de uma vez.
            'cobrar_taxa_servico' => ['nullable', 'boolean'],
        ], [
            'forma_pagamento.required' => 'Escolha a forma de pagamento.',
            'forma_pagamento.in' => 'Forma de pagamento inválida.',
        ]);

        return $this->alterar($conta, function (Conta $c) use ($dados, $request) {
            if (array_key_exists('cobrar_taxa_servico', $dados) && !$c->temPagamentoAprovado()) {
                $this->contas->configurarDivisao($c, null, (bool) $dados['cobrar_taxa_servico']);
            }
            $this->contas->registrarPagamento($c, $dados, $request->user());
        });
    }

    /** Equipe confirma o pagamento feito na maquininha (débito/crédito) ou no caixa. */
    public function confirmarPagamento(Request $request, Pagamento $pagamento): JsonResponse
    {
        $dados = $request->validate([
            'forma_pagamento' => ['required', Rule::in(Conta::FORMAS_PAGAMENTO)],
            'valor_recebido' => ['nullable', 'numeric', 'min:0'],
        ]);

        return $this->alterar($pagamento->conta, function () use ($pagamento, $dados, $request) {
            $this->contas->confirmarPagamento(
                Pagamento::lockForUpdate()->findOrFail($pagamento->id),
                $dados['forma_pagamento'],
                $request->user(),
                isset($dados['valor_recebido']) ? (float) $dados['valor_recebido'] : null,
            );
        });
    }

    public function cancelarPagamento(Pagamento $pagamento): JsonResponse
    {
        return $this->alterar($pagamento->conta, function () use ($pagamento) {
            $this->contas->cancelarPagamento(Pagamento::lockForUpdate()->findOrFail($pagamento->id));
        });
    }

    /** Executa a alteração com a conta travada, avisa caixa/salão/tablet e devolve a conta. */
    private function alterar(Conta $conta, callable $acao): JsonResponse
    {
        DB::transaction(function () use ($conta, $acao) {
            $acao(Conta::lockForUpdate()->findOrFail($conta->id));
        });

        $conta->refresh();
        broadcast(new ContaAtualizada($conta))->toOthers();

        return response()->json(new ContaResource($conta->load(self::RELACOES)));
    }
}

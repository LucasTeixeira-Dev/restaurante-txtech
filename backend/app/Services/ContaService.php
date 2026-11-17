<?php

namespace App\Services;

use App\Models\Caixa;
use App\Models\Conta;
use App\Models\Mesa;
use App\Models\Pagamento;
use App\Models\Pedido;
use App\Models\Usuario;
use App\Pagamentos\Pix\PixGateway;
use Illuminate\Validation\ValidationException;

/**
 * Ciclo da conta (comanda):
 *   aberta -> fechamento_solicitado (modo pagamento) -> paga   (ou cancelada)
 * No modo pagamento a conta pode ser dividida em N partes, cada uma paga por Pix,
 * maquininha ou no caixa. A mesa só é liberada quando os pagamentos aprovados cobrem o total.
 * Chamar dentro de uma transação.
 */
class ContaService
{
    private const MAX_PESSOAS = 20;

    public function __construct(private readonly PixGateway $pix)
    {
    }

    // ---------------------------------------------------------------- abertura

    /** Conta que recebe um pedido novo: a conta em aberto da mesa ou uma nova. */
    public function contaParaNovoPedido(?Mesa $mesa): Conta
    {
        if (!$mesa) {
            // Balcão: cada pedido tem a sua conta.
            return Conta::create(['status' => Conta::STATUS_ABERTA, 'aberta_em' => now()]);
        }

        $conta = Conta::emAberto()->where('mesa_id', $mesa->id)->lockForUpdate()->first();

        if ($conta) {
            $this->reabrirSeSolicitada($conta);

            return $conta;
        }

        $conta = Conta::create([
            'mesa_id' => $mesa->id,
            'status' => Conta::STATUS_ABERTA,
            'aberta_em' => now(),
        ]);
        $mesa->update(['status' => Mesa::STATUS_OCUPADA]);

        return $conta;
    }

    /**
     * Pedido novo numa conta em modo pagamento: volta a ser conta aberta.
     * Depois que alguém já pagou, a conta fica travada (o valor das partes mudaria).
     */
    public function reabrirSeSolicitada(?Conta $conta): void
    {
        if (!$conta || $conta->status !== Conta::STATUS_SOLICITADA) {
            return;
        }
        if ($conta->temPagamentoAprovado()) {
            throw ValidationException::withMessages([
                'conta' => 'A conta desta mesa já está sendo paga. Abra uma nova conta depois de quitar esta.',
            ]);
        }

        $conta->pagamentos()->pendentes()->update(['status' => Pagamento::STATUS_CANCELADO]);
        $conta->update(['status' => Conta::STATUS_ABERTA, 'solicitada_em' => null]);
    }

    // ---------------------------------------------------------- modo pagamento

    /** Mesa (tablet ou equipe) pede a conta: a conta entra em modo pagamento. */
    public function solicitarFechamento(Conta $conta): void
    {
        $this->garantirEmAberto($conta);

        if ($conta->calcularSubtotal() <= 0) {
            throw ValidationException::withMessages(['conta' => 'A conta ainda não tem consumo.']);
        }
        $this->garantirNadaEmPreparo($conta);
        $this->caixaAberto();

        if ($conta->status !== Conta::STATUS_SOLICITADA) {
            $conta->update(['status' => Conta::STATUS_SOLICITADA, 'solicitada_em' => now()]);
        }
    }

    /** Cliente desistiu de fechar agora: volta a poder pedir (só antes do primeiro pagamento). */
    public function voltarAoCardapio(Conta $conta): void
    {
        if ($conta->status !== Conta::STATUS_SOLICITADA) {
            throw ValidationException::withMessages(['conta' => 'A conta não está em pagamento.']);
        }
        $this->reabrirSeSolicitada($conta);
    }

    /** Divisão entre pessoas e taxa de serviço: só antes do primeiro pagamento. */
    public function configurarDivisao(Conta $conta, ?int $pessoas, ?bool $cobrarTaxa): void
    {
        $this->garantirEmAberto($conta);
        if ($conta->temPagamentoAprovado()) {
            throw ValidationException::withMessages([
                'conta' => 'Alguém já pagou: a divisão e a taxa não podem mais mudar.',
            ]);
        }
        if ($pessoas !== null && ($pessoas < 1 || $pessoas > self::MAX_PESSOAS)) {
            throw ValidationException::withMessages(['pessoas' => 'Divida entre 1 e ' . self::MAX_PESSOAS . ' pessoas.']);
        }

        // Valores mudam: cobranças pendentes (QR/maquininha) com o valor antigo deixam de valer.
        $conta->pagamentos()->pendentes()->update(['status' => Pagamento::STATUS_CANCELADO]);
        $conta->update(array_filter([
            'pessoas' => $pessoas,
            'cobrar_taxa_servico' => $cobrarTaxa,
        ], fn ($v) => $v !== null));
    }

    /**
     * Inicia o pagamento de uma parte: Pix (gera o QR), maquininha (avisa a equipe)
     * ou caixa (avisa o caixa). Fica pendente até ser aprovado.
     */
    public function iniciarPagamento(Conta $conta, int $parte, string $metodo, string $origem): Pagamento
    {
        if ($conta->status !== Conta::STATUS_SOLICITADA) {
            throw ValidationException::withMessages(['conta' => 'Peça a conta antes de pagar.']);
        }
        $this->expirarPixVencidos($conta);
        $conta->load('pagamentos');

        if ($parte < 1 || $parte > $conta->pessoas) {
            throw ValidationException::withMessages(['parte' => 'Parte inválida.']);
        }
        $valor = $conta->valorDaParte($parte);
        if ($valor <= 0) {
            throw ValidationException::withMessages(['parte' => "A parte {$parte} já foi paga."]);
        }

        // Reaproveita a cobrança pendente igual (ex.: tablet recarregou a tela do QR).
        $existente = $conta->pagamentos->first(fn (Pagamento $p) => $p->parte === $parte
            && $p->metodo === $metodo
            && $p->isPendente()
            && abs((float) $p->valor - $valor) < 0.005);
        if ($existente) {
            return $existente;
        }

        $conta->pagamentos()->pendentes()->where('parte', $parte)->update(['status' => Pagamento::STATUS_CANCELADO]);

        $pagamento = $conta->pagamentos()->create([
            'parte' => $parte,
            'valor' => $valor,
            'metodo' => $metodo,
            'forma' => $metodo === Pagamento::METODO_PIX ? 'pix' : null,
            'status' => Pagamento::STATUS_PENDENTE,
            'origem' => $origem,
            'caixa_id' => $this->caixaAberto()->id,
        ]);

        if ($metodo === Pagamento::METODO_PIX) {
            $cobranca = $this->pix->criarCobranca($pagamento);
            $pagamento->update([
                'provedor' => $this->pix->nome(),
                'referencia_externa' => $cobranca->referencia,
                'pix_copia_e_cola' => $cobranca->copiaECola,
                'expira_em' => $cobranca->expiraEm,
            ]);
        }

        return $pagamento;
    }

    /** Equipe confirma um pagamento pendente de maquininha/caixa (com a forma efetiva). */
    public function confirmarPagamento(Pagamento $pagamento, string $forma, Usuario $usuario, ?float $valorRecebido = null): bool
    {
        if (!$pagamento->isPendente()) {
            throw ValidationException::withMessages(['pagamento' => 'Este pagamento não está mais pendente.']);
        }
        if ($pagamento->metodo === Pagamento::METODO_PIX) {
            throw ValidationException::withMessages(['pagamento' => 'Pix é confirmado automaticamente pelo banco.']);
        }

        $this->aprovar($pagamento, $forma, $usuario, $valorRecebido);

        return $this->verificarQuitacao($pagamento->conta, $usuario);
    }

    /** Confirmação vinda do provedor de Pix (webhook). Idempotente. */
    public function aprovarPix(string $referencia): ?Pagamento
    {
        $pagamento = Pagamento::where('referencia_externa', $referencia)->lockForUpdate()->first();
        // Pix pago depois de expirar ainda é dinheiro recebido: aprova também.
        if (!$pagamento || !in_array($pagamento->status, [Pagamento::STATUS_PENDENTE, Pagamento::STATUS_EXPIRADO], true)) {
            return null;
        }

        $this->aprovar($pagamento, 'pix', null);
        $this->verificarQuitacao($pagamento->conta, null);

        return $pagamento;
    }

    /**
     * Caixa recebe direto (sem pedido prévio do tablet): uma parte, um valor avulso ou o restante.
     *
     * @param  array{forma_pagamento:string, parte?:int|null, valor?:float|null, valor_recebido?:float|null}  $dados
     * @return bool true se a conta foi quitada
     */
    public function registrarPagamento(Conta $conta, array $dados, Usuario $usuario): bool
    {
        $this->garantirEmAberto($conta);
        $this->garantirNadaEmPreparo($conta);
        $caixa = $this->caixaAberto();
        $conta->load('pagamentos');

        if ($conta->calcularSubtotal() <= 0) {
            throw ValidationException::withMessages(['conta' => 'A conta não tem consumo a receber.']);
        }

        $parte = isset($dados['parte']) ? (int) $dados['parte'] : null;
        if ($parte !== null) {
            if ($parte < 1 || $parte > $conta->pessoas) {
                throw ValidationException::withMessages(['parte' => 'Parte inválida.']);
            }
            $valor = $conta->valorDaParte($parte);
            if ($valor <= 0) {
                throw ValidationException::withMessages(['parte' => "A parte {$parte} já foi paga."]);
            }
        } else {
            $valor = isset($dados['valor']) ? round((float) $dados['valor'], 2) : $conta->restante();
        }

        if ($valor <= 0 || $valor > $conta->restante() + 0.005) {
            throw ValidationException::withMessages([
                'valor' => 'Valor inválido. Falta pagar R$ ' . number_format($conta->restante(), 2, ',', '.') . '.',
            ]);
        }

        if ($parte !== null) {
            $conta->pagamentos()->pendentes()->where('parte', $parte)->update(['status' => Pagamento::STATUS_CANCELADO]);
        }

        $pagamento = $conta->pagamentos()->create([
            'parte' => $parte,
            'valor' => $valor,
            'metodo' => Pagamento::METODO_CAIXA,
            'status' => Pagamento::STATUS_PENDENTE,
            'origem' => $usuario->hasRole('garcom') ? 'garcom' : 'caixa',
            'caixa_id' => $caixa->id,
        ]);
        $this->aprovar($pagamento, $dados['forma_pagamento'], $usuario, $dados['valor_recebido'] ?? null);

        return $this->verificarQuitacao($conta, $usuario);
    }

    public function cancelarPagamento(Pagamento $pagamento): void
    {
        if (!$pagamento->isPendente()) {
            throw ValidationException::withMessages(['pagamento' => 'Só pagamentos pendentes podem ser cancelados.']);
        }
        $pagamento->update(['status' => Pagamento::STATUS_CANCELADO]);
    }

    /** Pix pendentes com prazo vencido viram "expirado" (o QR deixa de valer na tela). */
    public function expirarPixVencidos(Conta $conta): void
    {
        $conta->pagamentos()
            ->pendentes()
            ->where('metodo', Pagamento::METODO_PIX)
            ->where('expira_em', '<', now())
            ->update(['status' => Pagamento::STATUS_EXPIRADO]);
    }

    // ------------------------------------------------------------- quitação

    /**
     * Quita a conta quando os pagamentos aprovados cobrem o total: grava os valores finais,
     * dá como entregues os pedidos prontos e libera a mesa.
     */
    public function verificarQuitacao(Conta $conta, ?Usuario $usuario): bool
    {
        $conta->refresh()->load('pagamentos');
        if (!$conta->isEmAberto() || $conta->restante() > 0.005) {
            return false;
        }

        $aprovados = $conta->pagamentos->where('status', Pagamento::STATUS_APROVADO);
        $formas = $aprovados->pluck('forma')->filter()->unique();

        $subtotal = round($conta->calcularSubtotal(), 2);
        $taxa = $conta->taxaAtual();

        $conta->update([
            'status' => Conta::STATUS_PAGA,
            'subtotal' => $subtotal,
            'taxa_servico' => $taxa,
            'total' => round($subtotal + $taxa, 2),
            // Uma forma só: grava; várias (conta dividida): o detalhe fica nos pagamentos.
            'forma_pagamento' => $formas->count() === 1 ? $formas->first() : null,
            'valor_recebido' => round($aprovados->sum(fn ($p) => (float) ($p->valor_recebido ?? $p->valor)), 2),
            'troco' => round($aprovados->sum(fn ($p) => (float) $p->troco), 2),
            'caixa_id' => Caixa::aberto()->latest('aberto_em')->value('id') ?? $aprovados->last()?->caixa_id,
            'usuario_fechamento_id' => $usuario?->id,
            'paga_em' => now(),
        ]);

        $conta->pagamentos()->pendentes()->update(['status' => Pagamento::STATUS_CANCELADO]);

        // O que já estava pronto foi consumido na mesa.
        $conta->pedidos()
            ->where('status', Pedido::STATUS_PRONTO)
            ->update(['status' => Pedido::STATUS_ENTREGUE, 'entregue_em' => now()]);

        $conta->mesa?->liberar();

        return true;
    }

    /** Conta sem nenhum pedido válido (todos cancelados) é cancelada e a mesa liberada. */
    public function cancelarSeVazia(?Conta $conta): bool
    {
        if (!$conta || !$conta->isEmAberto()) {
            return false;
        }

        $temPedidoValido = $conta->pedidos()->where('status', '!=', Pedido::STATUS_CANCELADO)->exists();
        if ($temPedidoValido) {
            return false;
        }

        $conta->pagamentos()->pendentes()->update(['status' => Pagamento::STATUS_CANCELADO]);
        $conta->update(['status' => Conta::STATUS_CANCELADA]);
        $conta->mesa?->liberar();

        return true;
    }

    // ------------------------------------------------------------- apoio

    private function aprovar(Pagamento $pagamento, string $forma, ?Usuario $usuario, ?float $valorRecebido = null): void
    {
        if (!in_array($forma, Conta::FORMAS_PAGAMENTO, true)) {
            throw ValidationException::withMessages(['forma_pagamento' => 'Forma de pagamento inválida.']);
        }

        $valor = (float) $pagamento->valor;
        $recebido = $valor;
        if ($forma === 'dinheiro' && $valorRecebido !== null) {
            if ($valorRecebido + 0.005 < $valor) {
                throw ValidationException::withMessages([
                    'valor_recebido' => 'Valor recebido menor que o valor a pagar (R$ ' . number_format($valor, 2, ',', '.') . ').',
                ]);
            }
            $recebido = round($valorRecebido, 2);
        }

        $pagamento->update([
            'forma' => $forma,
            'status' => Pagamento::STATUS_APROVADO,
            'valor_recebido' => $recebido,
            'troco' => round($recebido - $valor, 2),
            'usuario_id' => $usuario?->id,
            'pago_em' => now(),
        ]);
    }

    private function garantirEmAberto(Conta $conta): void
    {
        if (!$conta->isEmAberto()) {
            throw ValidationException::withMessages(['conta' => 'Esta conta já foi encerrada.']);
        }
    }

    /** Conta só fecha com tudo pronto: itens ainda na cozinha/bar bloqueiam. */
    private function garantirNadaEmPreparo(Conta $conta): void
    {
        $emPreparo = $conta->pedidos()
            ->whereIn('status', [Pedido::STATUS_ABERTO, Pedido::STATUS_EM_PREPARO])
            ->pluck('id');

        if ($emPreparo->isNotEmpty()) {
            throw ValidationException::withMessages([
                'conta' => 'Ainda há pedidos sendo preparados (#' . $emPreparo->implode(', #') . '). '
                    . 'A conta pode ser fechada quando tudo estiver pronto.',
            ]);
        }
    }

    private function caixaAberto(): Caixa
    {
        $caixa = Caixa::aberto()->latest('aberto_em')->first();
        if (!$caixa) {
            throw ValidationException::withMessages([
                'caixa' => 'O caixa está fechado. Chame um atendente para fechar a conta.',
            ]);
        }

        return $caixa;
    }
}

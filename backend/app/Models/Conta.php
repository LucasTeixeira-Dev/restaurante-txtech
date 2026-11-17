<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * Conta (comanda) de uma mesa: agrupa os pedidos até o pagamento no caixa.
 */
class Conta extends Model
{
    use HasFactory;

    protected $table = 'contas';

    protected $fillable = [
        'mesa_id',
        'status',
        'pessoas',
        'cobrar_taxa_servico',
        'subtotal',
        'taxa_servico',
        'total',
        'forma_pagamento',
        'valor_recebido',
        'troco',
        'caixa_id',
        'usuario_fechamento_id',
        'aberta_em',
        'solicitada_em',
        'paga_em',
    ];

    protected $casts = [
        'pessoas' => 'integer',
        'cobrar_taxa_servico' => 'boolean',
        'subtotal' => 'decimal:2',
        'taxa_servico' => 'decimal:2',
        'total' => 'decimal:2',
        'valor_recebido' => 'decimal:2',
        'troco' => 'decimal:2',
        'aberta_em' => 'datetime',
        'solicitada_em' => 'datetime',
        'paga_em' => 'datetime',
    ];

    const STATUS_ABERTA = 'aberta';
    const STATUS_SOLICITADA = 'fechamento_solicitado';
    const STATUS_PAGA = 'paga';
    const STATUS_CANCELADA = 'cancelada';

    const STATUS_EM_ABERTO = [self::STATUS_ABERTA, self::STATUS_SOLICITADA];

    const FORMAS_PAGAMENTO = ['dinheiro', 'debito', 'credito', 'pix'];

    public function mesa()
    {
        return $this->belongsTo(Mesa::class, 'mesa_id');
    }

    public function pedidos()
    {
        return $this->hasMany(Pedido::class, 'conta_id');
    }

    public function caixa()
    {
        return $this->belongsTo(Caixa::class, 'caixa_id');
    }

    public function pagamentos()
    {
        return $this->hasMany(Pagamento::class, 'conta_id');
    }

    public function usuarioFechamento()
    {
        return $this->belongsTo(Usuario::class, 'usuario_fechamento_id');
    }

    public function scopeEmAberto($query)
    {
        return $query->whereIn('status', self::STATUS_EM_ABERTO);
    }

    public function scopePagas($query)
    {
        return $query->where('status', self::STATUS_PAGA);
    }

    public function isEmAberto(): bool
    {
        return in_array($this->status, self::STATUS_EM_ABERTO, true);
    }

    /** Soma dos pedidos não cancelados (para contas ainda abertas). */
    public function calcularSubtotal(): float
    {
        if ($this->relationLoaded('pedidos')) {
            return (float) $this->pedidos
                ->where('status', '!=', Pedido::STATUS_CANCELADO)
                ->sum(fn ($p) => (float) $p->total);
        }

        return (float) $this->pedidos()
            ->where('status', '!=', Pedido::STATUS_CANCELADO)
            ->sum('total');
    }

    /** Subtotal exibível: gravado se paga, calculado se aberta. */
    public function subtotalAtual(): float
    {
        return $this->isEmAberto() ? $this->calcularSubtotal() : (float) $this->subtotal;
    }

    public static function taxaServicoPercentual(): float
    {
        return (float) config('restaurante.taxa_servico_percentual', 10);
    }

    /** Taxa de serviço atual (gravada se paga; calculada se aberta). */
    public function taxaAtual(): float
    {
        if (!$this->isEmAberto()) {
            return (float) $this->taxa_servico;
        }

        return $this->cobrar_taxa_servico
            ? round($this->subtotalAtual() * self::taxaServicoPercentual() / 100, 2)
            : 0.0;
    }

    public function totalAtual(): float
    {
        return $this->isEmAberto()
            ? round($this->subtotalAtual() + $this->taxaAtual(), 2)
            : (float) $this->total;
    }

    public function totalPago(): float
    {
        $aprovados = $this->relationLoaded('pagamentos')
            ? $this->pagamentos->where('status', Pagamento::STATUS_APROVADO)
            : $this->pagamentos()->aprovados()->get();

        return round((float) $aprovados->sum(fn ($p) => (float) $p->valor), 2);
    }

    public function restante(): float
    {
        return max(0.0, round($this->totalAtual() - $this->totalPago(), 2));
    }

    public function temPagamentoAprovado(): bool
    {
        return $this->relationLoaded('pagamentos')
            ? $this->pagamentos->contains('status', Pagamento::STATUS_APROVADO)
            : $this->pagamentos()->aprovados()->exists();
    }

    /** Valor a cobrar da parte N (0 se ela já foi paga ou não existe). */
    public function valorDaParte(int $parte): float
    {
        foreach ($this->partes() as $p) {
            if ($p['parte'] === $parte) {
                return $p['status'] === 'paga' ? 0.0 : $p['valor'];
            }
        }

        return 0.0;
    }

    /**
     * Situação de cada parte da divisão igual entre as pessoas.
     * Divisão nominal: total / pessoas arredondado para baixo, a última parte leva os centavos.
     * Partes pagas mantêm o valor pago e as demais mantêm o valor nominal (o cliente não vê
     * o valor da própria parte mudar). Só quando o caixa recebe um valor avulso (fora das
     * partes) as partes que faltam redividem o restante.
     *
     * @return array<int, array{parte:int, valor:float, status:string, forma:?string, metodo:?string}>
     */
    public function partes(): array
    {
        $pagamentos = $this->relationLoaded('pagamentos') ? $this->pagamentos : $this->pagamentos()->get();
        $pessoas = max(1, (int) $this->pessoas);

        $aprovadoDa = fn (int $n) => $pagamentos->first(
            fn ($p) => (int) $p->parte === $n && $p->status === Pagamento::STATUS_APROVADO
        );
        $naoPagas = array_values(array_filter(range(1, $pessoas), fn ($n) => !$aprovadoDa($n)));
        $qtd = count($naoPagas);
        $restante = $this->restante();

        $temAvulso = $pagamentos->contains(
            fn ($p) => $p->parte === null && $p->status === Pagamento::STATUS_APROVADO
        );
        if ($temAvulso) {
            // Redivide o restante igualmente entre as partes que faltam.
            $base = $qtd > 0 ? floor($restante / $qtd * 100) / 100 : 0.0;
            $nominal = fn (int $n) => $base;
        } else {
            $total = $this->totalAtual();
            $base = floor($total / $pessoas * 100) / 100;
            $nominal = fn (int $n) => $n === $pessoas ? round($total - $base * ($pessoas - 1), 2) : $base;
        }
        // A última parte em aberto fecha a conta exata (absorve qualquer diferença de centavos).
        $somaOutras = array_sum(array_map(fn ($n) => $nominal($n), array_slice($naoPagas, 0, max(0, $qtd - 1))));

        $partes = [];
        foreach (range(1, $pessoas) as $n) {
            $aprovado = $aprovadoDa($n);
            $pendente = $pagamentos->first(
                fn ($p) => (int) $p->parte === $n && $p->status === Pagamento::STATUS_PENDENTE && !$p->expirou()
            );

            if ($aprovado) {
                $valor = (float) $aprovado->valor;
            } elseif ($n === end($naoPagas)) {
                $valor = round($restante - $somaOutras, 2);
            } else {
                $valor = $nominal($n);
            }

            $partes[] = [
                'parte' => $n,
                'valor' => $valor,
                'status' => $aprovado ? 'paga' : ($pendente ? 'aguardando' : 'em_aberto'),
                'forma' => $aprovado?->forma,
                'metodo' => ($aprovado ?? $pendente)?->metodo,
            ];
        }

        return $partes;
    }
}

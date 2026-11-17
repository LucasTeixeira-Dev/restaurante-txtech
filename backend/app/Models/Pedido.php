<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Pedido extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'pedidos';

    protected $fillable = [
        'mesa_id',
        'conta_id',
        'usuario_id',
        'status',
        'total',
        'observacoes',
        'entregue_em',
    ];

    protected $casts = [
        'total' => 'decimal:2',
        'entregue_em' => 'datetime',
    ];

    const STATUS_ABERTO = 'aberto';
    const STATUS_EM_PREPARO = 'em_preparo';
    const STATUS_PRONTO = 'pronto';
    const STATUS_ENTREGUE = 'entregue';
    const STATUS_CANCELADO = 'cancelado';

    /** Para cada status, os próximos permitidos. Entregue e cancelado são finais. */
    const TRANSICOES = [
        self::STATUS_ABERTO => [self::STATUS_EM_PREPARO, self::STATUS_CANCELADO],
        self::STATUS_EM_PREPARO => [self::STATUS_PRONTO, self::STATUS_CANCELADO],
        self::STATUS_PRONTO => [self::STATUS_ENTREGUE, self::STATUS_CANCELADO],
        self::STATUS_ENTREGUE => [],
        self::STATUS_CANCELADO => [],
    ];

    /** Papéis que podem levar o pedido a cada status. Chapeiro e bar só movem os itens do próprio setor. */
    const PAPEIS_POR_STATUS = [
        self::STATUS_EM_PREPARO => ['gerente', 'chapeiro', 'bar'],
        self::STATUS_PRONTO => ['gerente', 'chapeiro', 'bar'],
        self::STATUS_ENTREGUE => ['gerente', 'garcom'],
        self::STATUS_CANCELADO => ['gerente', 'garcom'],
    ];

    public static function statusPermitidos(): array
    {
        return [
            self::STATUS_ABERTO,
            self::STATUS_EM_PREPARO,
            self::STATUS_PRONTO,
            self::STATUS_ENTREGUE,
            self::STATUS_CANCELADO,
        ];
    }

    public function mesa()
    {
        return $this->belongsTo(Mesa::class, 'mesa_id');
    }

    public function usuario()
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }

    public function conta()
    {
        return $this->belongsTo(Conta::class, 'conta_id');
    }

    public function itens()
    {
        return $this->hasMany(ItemPedido::class, 'pedido_id');
    }

    public function recalcularTotal(): void
    {
        // Itens cancelados não entram na conta.
        $this->total = $this->itens()
            ->where('status', '!=', ItemPedido::STATUS_CANCELADO)
            ->sum('subtotal');
        $this->save();
    }

    public function podeIrPara(string $status): bool
    {
        return in_array($status, self::TRANSICOES[$this->status] ?? [], true);
    }

    public function isAberto(): bool
    {
        return $this->status === self::STATUS_ABERTO;
    }

    public function isCancelado(): bool
    {
        return $this->status === self::STATUS_CANCELADO;
    }

    public function isEncerrado(): bool
    {
        return in_array($this->status, [self::STATUS_ENTREGUE, self::STATUS_CANCELADO]);
    }

    public function scopeAtivos($query)
    {
        return $query->whereNotIn('status', [self::STATUS_ENTREGUE, self::STATUS_CANCELADO]);
    }

    public function scopeEmAberto($query)
    {
        return $query->where('status', self::STATUS_ABERTO);
    }

    public function scopePorStatus($query, string $status)
    {
        return $query->where('status', $status);
    }
}

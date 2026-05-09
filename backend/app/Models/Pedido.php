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
        'usuario_id',
        'status',
        'total',
        'observacoes',
    ];

    protected $casts = [
        'total' => 'decimal:2',
    ];

    const STATUS_ABERTO = 'aberto';
    const STATUS_EM_PREPARO = 'em_preparo';
    const STATUS_PRONTO = 'pronto';
    const STATUS_ENTREGUE = 'entregue';
    const STATUS_CANCELADO = 'cancelado';

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

    public function itens()
    {
        return $this->hasMany(ItemPedido::class, 'pedido_id');
    }

    public function recalcularTotal(): void
    {
        $this->total = $this->itens()->sum('subtotal');
        $this->save();
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

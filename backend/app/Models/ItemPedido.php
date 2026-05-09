<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ItemPedido extends Model
{
    use HasFactory;

    protected $table = 'itens_pedido';

    protected $fillable = [
        'pedido_id',
        'produto_id',
        'quantidade',
        'preco_unitario',
        'subtotal',
        'status',
        'observacoes',
    ];

    protected $casts = [
        'quantidade' => 'integer',
        'preco_unitario' => 'decimal:2',
        'subtotal' => 'decimal:2',
    ];

    const STATUS_PENDENTE = 'pendente';
    const STATUS_EM_PREPARO = 'em_preparo';
    const STATUS_PRONTO = 'pronto';
    const STATUS_CANCELADO = 'cancelado';

    protected static function boot(): void
    {
        parent::boot();

        static::saving(function (ItemPedido $item) {
            $item->subtotal = $item->quantidade * $item->preco_unitario;
        });

        static::saved(function (ItemPedido $item) {
            $item->pedido?->recalcularTotal();
        });

        static::deleted(function (ItemPedido $item) {
            $item->pedido?->recalcularTotal();
        });
    }

    public function pedido()
    {
        return $this->belongsTo(Pedido::class, 'pedido_id');
    }

    public function produto()
    {
        return $this->belongsTo(Produto::class, 'produto_id');
    }
}

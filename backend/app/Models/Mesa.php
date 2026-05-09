<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Mesa extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'mesas';

    protected $fillable = [
        'numero',
        'capacidade',
        'status',
        'qr_code_token',
    ];

    protected $casts = [
        'numero' => 'integer',
        'capacidade' => 'integer',
    ];

    const STATUS_LIVRE = 'livre';
    const STATUS_OCUPADA = 'ocupada';
    const STATUS_RESERVADA = 'reservada';

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (Mesa $mesa) {
            if (empty($mesa->qr_code_token)) {
                $mesa->qr_code_token = Str::uuid()->toString();
            }
        });
    }

    public function pedidos()
    {
        return $this->hasMany(Pedido::class, 'mesa_id');
    }

    public function pedidoAtivo()
    {
        return $this->hasOne(Pedido::class, 'mesa_id')
            ->whereNotIn('status', ['entregue', 'cancelado'])
            ->latest();
    }

    public function isLivre(): bool
    {
        return $this->status === self::STATUS_LIVRE;
    }

    public function isOcupada(): bool
    {
        return $this->status === self::STATUS_OCUPADA;
    }

    public function scopeLivres($query)
    {
        return $query->where('status', self::STATUS_LIVRE);
    }

    public function scopeOcupadas($query)
    {
        return $query->where('status', self::STATUS_OCUPADA);
    }
}

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
        'garcom_chamado_em',
    ];

    protected $casts = [
        'numero' => 'integer',
        'capacidade' => 'integer',
        'garcom_chamado_em' => 'datetime',
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

    public function contas()
    {
        return $this->hasMany(Conta::class, 'mesa_id');
    }

    /** Conta ainda não paga da mesa (há no máximo uma). */
    public function contaEmAberto()
    {
        return $this->hasOne(Conta::class, 'mesa_id')
            ->whereIn('status', Conta::STATUS_EM_ABERTO)
            ->latest('aberta_em');
    }

    /** Usuário de autoatendimento (tablet) desta mesa, se configurado. */
    public function usuarioAutoatendimento()
    {
        return $this->hasOne(Usuario::class, 'mesa_id');
    }

    /** Mesa volta a ficar livre: chamada quando a conta é paga ou cancelada. */
    public function liberar(): void
    {
        $this->update([
            'status' => self::STATUS_LIVRE,
            'garcom_chamado_em' => null,
        ]);
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

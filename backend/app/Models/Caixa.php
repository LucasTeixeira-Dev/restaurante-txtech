<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Caixa extends Model
{
    use HasFactory;

    protected $table = 'caixas';

    protected $fillable = [
        'usuario_id',
        'usuario_fechamento_id',
        'saldo_inicial',
        'saldo_final',
        'total_vendas',
        'aberto_em',
        'fechado_em',
        'observacoes',
    ];

    protected $casts = [
        'saldo_inicial' => 'decimal:2',
        'saldo_final' => 'decimal:2',
        'total_vendas' => 'decimal:2',
        'aberto_em' => 'datetime',
        'fechado_em' => 'datetime',
    ];

    public function usuario()
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }

    public function usuarioFechamento()
    {
        return $this->belongsTo(Usuario::class, 'usuario_fechamento_id');
    }

    public function isAberto(): bool
    {
        return is_null($this->fechado_em);
    }

    public function scopeAberto($query)
    {
        return $query->whereNull('fechado_em');
    }
}

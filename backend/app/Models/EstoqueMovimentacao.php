<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EstoqueMovimentacao extends Model
{
    use HasFactory;

    protected $table = 'estoque_movimentacoes';

    protected $fillable = [
        'produto_id',
        'usuario_id',
        'tipo',
        'quantidade',
        'quantidade_anterior',
        'quantidade_posterior',
        'motivo',
        'referencia_id',
        'referencia_tipo',
    ];

    protected $casts = [
        'quantidade' => 'decimal:3',
        'quantidade_anterior' => 'decimal:3',
        'quantidade_posterior' => 'decimal:3',
    ];

    const TIPO_ENTRADA = 'entrada';
    const TIPO_SAIDA = 'saida';
    const TIPO_AJUSTE = 'ajuste';

    public function produto()
    {
        return $this->belongsTo(Produto::class, 'produto_id');
    }

    public function usuario()
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }
}

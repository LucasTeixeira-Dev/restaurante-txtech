<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Estoque extends Model
{
    use HasFactory;

    protected $table = 'estoque';

    protected $fillable = [
        'produto_id',
        'quantidade',
        'quantidade_minima',
        'unidade',
    ];

    protected $casts = [
        'quantidade' => 'decimal:3',
        'quantidade_minima' => 'decimal:3',
    ];

    public function produto()
    {
        return $this->belongsTo(Produto::class, 'produto_id');
    }

    public function movimentacoes()
    {
        return $this->hasMany(EstoqueMovimentacao::class, 'produto_id', 'produto_id');
    }

    public function estaBaixo(): bool
    {
        return $this->quantidade <= $this->quantidade_minima;
    }

    public function scopeAbaixoMinimo($query)
    {
        return $query->whereColumn('quantidade', '<=', 'quantidade_minima');
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\MediaLibrary\HasMedia;
use Spatie\MediaLibrary\InteractsWithMedia;

class Produto extends Model implements HasMedia
{
    use HasFactory, InteractsWithMedia, SoftDeletes;

    protected $table = 'produtos';

    protected $fillable = [
        'categoria_id',
        'nome',
        'descricao',
        'preco',
        'disponivel',
        'tempo_preparo',
        'controla_estoque',
    ];

    protected $casts = [
        'preco' => 'decimal:2',
        'disponivel' => 'boolean',
        'tempo_preparo' => 'integer',
        'controla_estoque' => 'boolean',
    ];

    public function categoria()
    {
        return $this->belongsTo(Categoria::class, 'categoria_id');
    }

    public function itensPedido()
    {
        return $this->hasMany(ItemPedido::class, 'produto_id');
    }

    public function estoque()
    {
        return $this->hasOne(Estoque::class, 'produto_id');
    }

    public function movimentacoes()
    {
        return $this->hasMany(EstoqueMovimentacao::class, 'produto_id');
    }

    public function scopeDisponiveis($query)
    {
        return $query->where('disponivel', true);
    }

    public function scopeDaCategoria($query, int $categoriaId)
    {
        return $query->where('categoria_id', $categoriaId);
    }

    public function registerMediaCollections(): void
    {
        $this->addMediaCollection('imagem')
            ->singleFile();
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class Usuario extends Authenticatable
{
    use HasApiTokens, HasFactory, HasRoles, Notifiable, SoftDeletes;

    protected $table = 'usuarios';

    protected $fillable = [
        'nome',
        'email',
        'senha',
        'ativo',
    ];

    protected $hidden = [
        'senha',
        'remember_token',
    ];

    protected $casts = [
        'ativo' => 'boolean',
        'email_verified_at' => 'datetime',
    ];

    // Sobrescreve o campo de senha do Authenticatable
    public function getAuthPassword(): string
    {
        return $this->senha;
    }

    public function isGerente(): bool
    {
        return $this->hasRole('gerente');
    }

    public function isGarcom(): bool
    {
        return $this->hasRole('garcom');
    }

    public function isChapeiro(): bool
    {
        return $this->hasRole('chapeiro');
    }

    public function isCaixa(): bool
    {
        return $this->hasRole('caixa');
    }

    public function pedidos()
    {
        return $this->hasMany(Pedido::class, 'usuario_id');
    }

    public function caixas()
    {
        return $this->hasMany(Caixa::class, 'usuario_id');
    }

    public function scopeAtivos($query)
    {
        return $query->where('ativo', true);
    }
}

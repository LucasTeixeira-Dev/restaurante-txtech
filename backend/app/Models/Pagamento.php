<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Um pagamento (total ou parcial) de uma conta. */
class Pagamento extends Model
{
    protected $table = 'pagamentos';

    protected $fillable = [
        'conta_id',
        'parte',
        'valor',
        'metodo',
        'forma',
        'status',
        'origem',
        'valor_recebido',
        'troco',
        'provedor',
        'referencia_externa',
        'pix_copia_e_cola',
        'expira_em',
        'caixa_id',
        'usuario_id',
        'pago_em',
    ];

    protected $casts = [
        'parte' => 'integer',
        'valor' => 'decimal:2',
        'valor_recebido' => 'decimal:2',
        'troco' => 'decimal:2',
        'expira_em' => 'datetime',
        'pago_em' => 'datetime',
    ];

    const METODO_PIX = 'pix';
    const METODO_MAQUININHA = 'maquininha';
    const METODO_CAIXA = 'caixa';

    const STATUS_PENDENTE = 'pendente';
    const STATUS_APROVADO = 'aprovado';
    const STATUS_CANCELADO = 'cancelado';
    const STATUS_EXPIRADO = 'expirado';

    public function conta()
    {
        return $this->belongsTo(Conta::class, 'conta_id');
    }

    public function usuario()
    {
        return $this->belongsTo(Usuario::class, 'usuario_id');
    }

    public function scopeAprovados($query)
    {
        return $query->where('status', self::STATUS_APROVADO);
    }

    public function scopePendentes($query)
    {
        return $query->where('status', self::STATUS_PENDENTE);
    }

    public function isPendente(): bool
    {
        return $this->status === self::STATUS_PENDENTE;
    }

    /** Pix pendente com prazo vencido. */
    public function expirou(): bool
    {
        return $this->isPendente() && $this->expira_em && $this->expira_em->isPast();
    }
}

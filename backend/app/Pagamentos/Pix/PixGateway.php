<?php

namespace App\Pagamentos\Pix;

use App\Models\Pagamento;
use Illuminate\Http\Request;

/**
 * Provedor de Pix (banco ou intermediador). Para integrar um provedor real:
 * 1. criar uma classe que implemente esta interface (ex.: MercadoPagoPixGateway);
 * 2. registrá-la em AppServiceProvider para o valor de PIX_DRIVER;
 * 3. apontar o webhook do provedor para POST /api/v1/webhooks/pix.
 */
interface PixGateway
{
    /** Nome curto gravado em pagamentos.provedor. */
    public function nome(): string;

    /** Cria a cobrança Pix (QR dinâmico) com o valor exato do pagamento. */
    public function criarCobranca(Pagamento $pagamento): CobrancaPix;

    /**
     * Valida a notificação do provedor e devolve as referências (txid) das cobranças pagas.
     * Notificação inválida (assinatura errada etc.) devolve lista vazia.
     *
     * @return string[]
     */
    public function cobrancasPagas(Request $request): array;
}

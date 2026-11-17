<?php

namespace App\Pagamentos\Pix;

use App\Models\Pagamento;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Pix de mentira para desenvolvimento e testes: gera um código claramente falso
 * (nenhum app de banco consegue pagá-lo) e aceita a "confirmação" pelo mesmo webhook
 * que o provedor real usaria, assinado com PIX_WEBHOOK_SECRET.
 */
class SimuladoPixGateway implements PixGateway
{
    public function nome(): string
    {
        return 'simulado';
    }

    public function criarCobranca(Pagamento $pagamento): CobrancaPix
    {
        $txid = 'SIM' . Str::upper(Str::random(29));
        $valor = number_format((float) $pagamento->valor, 2, '.', '');

        return new CobrancaPix(
            referencia: $txid,
            copiaECola: "PIX-SIMULADO|conta={$pagamento->conta_id}|valor={$valor}|txid={$txid}",
            expiraEm: now()->addMinutes((int) config('restaurante.pix.expiracao_minutos', 15)),
        );
    }

    /** Corpo esperado: {"txids": ["SIM..."]} com o cabeçalho X-Webhook-Secret. */
    public function cobrancasPagas(Request $request): array
    {
        $segredo = (string) config('restaurante.pix.webhook_secret');
        if ($segredo === '' || !hash_equals($segredo, (string) $request->header('X-Webhook-Secret'))) {
            return [];
        }

        return array_values(array_filter((array) $request->input('txids', []), 'is_string'));
    }
}

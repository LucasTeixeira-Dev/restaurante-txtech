<?php

namespace App\Http\Controllers\Api\V1;

use App\Events\ContaAtualizada;
use App\Http\Controllers\Controller;
use App\Pagamentos\Pix\PixGateway;
use App\Services\ContaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Notificação de Pix pago enviada pelo provedor (rota pública, autenticada pela assinatura
 * que o próprio provedor valida). Idempotente: o mesmo aviso repetido não paga duas vezes.
 */
class WebhookPixController extends Controller
{
    public function __invoke(Request $request, PixGateway $pix, ContaService $contas): JsonResponse
    {
        $referencias = $pix->cobrancasPagas($request);
        if ($referencias === []) {
            Log::warning('Webhook Pix recusado ou vazio', ['ip' => $request->ip()]);

            return response()->json(['message' => 'Notificação inválida.'], 401);
        }

        $aprovados = 0;
        foreach ($referencias as $referencia) {
            $pagamento = DB::transaction(fn () => $contas->aprovarPix($referencia));
            if ($pagamento) {
                $aprovados++;
                broadcast(new ContaAtualizada($pagamento->conta->refresh()));
            }
        }

        return response()->json(['aprovados' => $aprovados]);
    }
}

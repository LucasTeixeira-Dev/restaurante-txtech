<?php

return [
    // Taxa de serviço sugerida no fechamento da conta (o cliente ou o caixa pode tirar).
    'taxa_servico_percentual' => (float) env('TAXA_SERVICO_PERCENTUAL', 10),

    // Domínio dos logins de autoatendimento: mesa5@<dominio>.
    'dominio_login_mesa' => env('DOMINIO_LOGIN_MESA', 'autoatendimento.local'),

    'pix' => [
        // "simulado" em desenvolvimento; o provedor real entra como outro driver (ver App\Pagamentos\Pix).
        'driver' => env('PIX_DRIVER', 'simulado'),
        // Validade do QR Code de cada cobrança.
        'expiracao_minutos' => (int) env('PIX_EXPIRACAO_MINUTOS', 15),
        // Segredo que o webhook precisa enviar (no simulado, no cabeçalho X-Webhook-Secret).
        'webhook_secret' => env('PIX_WEBHOOK_SECRET'),
    ],
];

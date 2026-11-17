<?php

namespace App\Pagamentos\Pix;

use Carbon\CarbonInterface;

/** Dados da cobrança Pix criada no provedor. */
final class CobrancaPix
{
    public function __construct(
        public readonly string $referencia,   // txid no provedor
        public readonly string $copiaECola,   // código "Pix copia e cola" (o QR é desenhado a partir dele)
        public readonly CarbonInterface $expiraEm,
    ) {
    }
}

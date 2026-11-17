<?php

namespace App\Providers;

use App\Pagamentos\Pix\PixGateway;
use App\Pagamentos\Pix\SimuladoPixGateway;
use Illuminate\Support\ServiceProvider;
use InvalidArgumentException;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Provedor de Pix escolhido por PIX_DRIVER. Novo provedor = novo case aqui.
        $this->app->bind(PixGateway::class, function () {
            return match (config('restaurante.pix.driver')) {
                'simulado' => new SimuladoPixGateway(),
                default => throw new InvalidArgumentException(
                    'PIX_DRIVER desconhecido: ' . config('restaurante.pix.driver')
                ),
            };
        });
    }

    public function boot(): void
    {
        //
    }
}

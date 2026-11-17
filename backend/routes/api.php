<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\AutoatendimentoController;
use App\Http\Controllers\Api\V1\CardapioController;
use App\Http\Controllers\Api\V1\CaixaController;
use App\Http\Controllers\Api\V1\CategoriaController;
use App\Http\Controllers\Api\V1\ContaController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\EstoqueController;
use App\Http\Controllers\Api\V1\MesaController;
use App\Http\Controllers\Api\V1\PedidoController;
use App\Http\Controllers\Api\V1\ProdutoController;
use App\Http\Controllers\Api\V1\RelatorioController;
use App\Http\Controllers\Api\V1\UsuarioController;
use App\Http\Controllers\Api\V1\WebhookPixController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    // Rotas públicas
    Route::post('auth/login', [AuthController::class, 'login']);
    Route::get('cardapio', [CardapioController::class, 'index']);
    Route::get('cardapio/{produto}', [CardapioController::class, 'show']);

    // Provedor de Pix avisa pagamento (autenticado pela assinatura, validada no PixGateway).
    Route::post('webhooks/pix', WebhookPixController::class)->middleware('throttle:120,1');

    // Rotas autenticadas
    Route::middleware('auth:sanctum')->group(function () {

        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('auth/me', [AuthController::class, 'me']);

        // Tablet de autoatendimento: só o papel "mesa", e sempre a mesa do próprio login.
        Route::middleware('role:mesa')->prefix('autoatendimento')->group(function () {
            Route::get('sessao', [AutoatendimentoController::class, 'sessao']);
            Route::post('pedidos', [AutoatendimentoController::class, 'fazerPedido']);
            Route::post('pedir-conta', [AutoatendimentoController::class, 'pedirConta']);
            Route::post('voltar-cardapio', [AutoatendimentoController::class, 'voltarAoCardapio']);
            Route::put('conta/divisao', [AutoatendimentoController::class, 'configurarDivisao']);
            Route::post('pagamentos', [AutoatendimentoController::class, 'pagar']);
            Route::post('pagamentos/{pagamento}/simular-pix', [AutoatendimentoController::class, 'simularPix']);
            Route::post('chamar-garcom', [AutoatendimentoController::class, 'chamarGarcom']);
        });

        // Equipe: o usuário "mesa" não alcança nada daqui para baixo.
        Route::middleware('role:gerente|garcom|chapeiro|caixa|bar')->group(function () {

            // Dashboard — toda a equipe (valores financeiros só para gerente e caixa)
            Route::get('dashboard', [DashboardController::class, 'index']);

            // Usuários — apenas gerente
            Route::apiResource('usuarios', UsuarioController::class)
                ->middleware('role:gerente');

            // Categorias — equipe lista; gerente gerencia
            Route::get('categorias', [CategoriaController::class, 'index']);
            Route::get('categorias/{categoria}', [CategoriaController::class, 'show']);
            Route::middleware('role:gerente')->group(function () {
                Route::post('categorias', [CategoriaController::class, 'store']);
                Route::put('categorias/{categoria}', [CategoriaController::class, 'update']);
                Route::delete('categorias/{categoria}', [CategoriaController::class, 'destroy']);
            });

            // Produtos — equipe lista; gerente gerencia
            Route::get('produtos', [ProdutoController::class, 'index']);
            Route::get('produtos/{produto}', [ProdutoController::class, 'show']);
            Route::middleware('role:gerente')->group(function () {
                Route::post('produtos', [ProdutoController::class, 'store']);
                Route::put('produtos/{produto}', [ProdutoController::class, 'update']);
                Route::delete('produtos/{produto}', [ProdutoController::class, 'destroy']);
            });

            // Mesas — equipe vê; gerente gerencia
            Route::get('mesas', [MesaController::class, 'index']);
            Route::get('mesas/qr/{token}', [MesaController::class, 'buscarPorQr']);
            Route::get('mesas/{mesa}', [MesaController::class, 'show']);
            Route::middleware('role:gerente')->group(function () {
                Route::post('mesas', [MesaController::class, 'store']);
                Route::put('mesas/{mesa}', [MesaController::class, 'update']);
                Route::delete('mesas/{mesa}', [MesaController::class, 'destroy']);
                Route::put('mesas/{mesa}/autoatendimento', [MesaController::class, 'configurarAutoatendimento']);
            });
            Route::post('mesas/{mesa}/status', [MesaController::class, 'atualizarStatus'])
                ->middleware('role:gerente|garcom');
            Route::post('mesas/{mesa}/atender-chamado', [MesaController::class, 'atenderChamado'])
                ->middleware('role:gerente|garcom');

            // Pedidos — garçom cria; cozinha e bar preparam; papel por status validado no PedidoService.
            Route::get('pedidos', [PedidoController::class, 'index']);
            Route::get('pedidos/{pedido}', [PedidoController::class, 'show']);
            Route::post('pedidos', [PedidoController::class, 'store'])
                ->middleware('role:gerente|garcom');
            Route::put('pedidos/{pedido}/status', [PedidoController::class, 'atualizarStatus'])
                ->middleware('role:gerente|garcom|chapeiro|bar');
            Route::post('pedidos/{pedido}/itens', [PedidoController::class, 'adicionarItens'])
                ->middleware('role:gerente|garcom');
            Route::delete('pedidos/{pedido}/itens/{item}', [PedidoController::class, 'removerItem'])
                ->middleware('role:gerente|garcom');
            Route::put('pedidos/{pedido}/itens/{item}/status', [PedidoController::class, 'atualizarStatusItem'])
                ->middleware('role:gerente|chapeiro|bar');
            Route::delete('pedidos/{pedido}', [PedidoController::class, 'destroy'])
                ->middleware('role:gerente|garcom');

            // Contas (comandas) — salão e caixa acompanham; só caixa e gerente recebem.
            Route::middleware('role:gerente|garcom|caixa')->group(function () {
                Route::get('contas', [ContaController::class, 'index']);
                Route::get('contas/{conta}', [ContaController::class, 'show']);
                Route::post('contas/{conta}/solicitar-fechamento', [ContaController::class, 'solicitarFechamento']);
                Route::put('contas/{conta}/divisao', [ContaController::class, 'configurarDivisao']);
                // Garçom confirma a maquininha que levou à mesa; caixa confirma o que recebeu.
                Route::post('pagamentos/{pagamento}/confirmar', [ContaController::class, 'confirmarPagamento']);
                Route::post('pagamentos/{pagamento}/cancelar', [ContaController::class, 'cancelarPagamento']);
            });
            Route::post('contas/{conta}/pagar', [ContaController::class, 'pagar'])
                ->middleware('role:gerente|caixa');

            // Estoque — gerente gerencia
            Route::middleware('role:gerente')->group(function () {
                Route::get('estoque', [EstoqueController::class, 'index']);
                Route::get('estoque/{produto}', [EstoqueController::class, 'show']);
                Route::post('estoque/{produto}/movimentacao', [EstoqueController::class, 'movimentar']);
            });

            // Caixa — gerente e caixa
            Route::middleware('role:gerente|caixa')->group(function () {
                Route::get('caixa', [CaixaController::class, 'index']);
                Route::get('caixa/atual', [CaixaController::class, 'atual']);
                Route::post('caixa/abrir', [CaixaController::class, 'abrir']);
                Route::post('caixa/fechar', [CaixaController::class, 'fechar']);
                Route::get('caixa/{caixa}', [CaixaController::class, 'show']);
            });

            // Relatórios — apenas gerente
            Route::middleware('role:gerente')->prefix('relatorios')->group(function () {
                Route::get('vendas', [RelatorioController::class, 'vendas']);
                Route::get('produtos-mais-vendidos', [RelatorioController::class, 'produtosMaisVendidos']);
                Route::get('financeiro', [RelatorioController::class, 'financeiro']);
                Route::get('estoque', [RelatorioController::class, 'estoque']);
            });
        });
    });
});

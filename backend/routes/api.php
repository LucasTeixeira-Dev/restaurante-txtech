<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CardapioController;
use App\Http\Controllers\Api\V1\CaixaController;
use App\Http\Controllers\Api\V1\CategoriaController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\EstoqueController;
use App\Http\Controllers\Api\V1\MesaController;
use App\Http\Controllers\Api\V1\PedidoController;
use App\Http\Controllers\Api\V1\ProdutoController;
use App\Http\Controllers\Api\V1\RelatorioController;
use App\Http\Controllers\Api\V1\UsuarioController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    // Rotas públicas
    Route::post('auth/login', [AuthController::class, 'login']);
    Route::get('cardapio', [CardapioController::class, 'index']);
    Route::get('cardapio/{produto}', [CardapioController::class, 'show']);

    // Rotas autenticadas
    Route::middleware('auth:sanctum')->group(function () {

        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('auth/me', [AuthController::class, 'me']);

        // Dashboard — todos autenticados
        Route::get('dashboard', [DashboardController::class, 'index']);

        // Usuários — apenas gerente
        Route::apiResource('usuarios', UsuarioController::class)
            ->middleware('role:gerente');

        // Categorias — todos autenticados listam; gerente gerencia
        Route::get('categorias', [CategoriaController::class, 'index']);
        Route::get('categorias/{categoria}', [CategoriaController::class, 'show']);
        Route::middleware('role:gerente')->group(function () {
            Route::post('categorias', [CategoriaController::class, 'store']);
            Route::put('categorias/{categoria}', [CategoriaController::class, 'update']);
            Route::delete('categorias/{categoria}', [CategoriaController::class, 'destroy']);
        });

        // Produtos — gerente e caixa podem listar; gerente gerencia
        Route::get('produtos', [ProdutoController::class, 'index']);
        Route::get('produtos/{produto}', [ProdutoController::class, 'show']);
        Route::middleware('role:gerente')->group(function () {
            Route::post('produtos', [ProdutoController::class, 'store']);
            Route::put('produtos/{produto}', [ProdutoController::class, 'update']);
            Route::delete('produtos/{produto}', [ProdutoController::class, 'destroy']);
        });

        // Mesas — todos autenticados podem ver; gerente gerencia
        Route::get('mesas', [MesaController::class, 'index']);
        Route::get('mesas/{mesa}', [MesaController::class, 'show']);
        Route::middleware('role:gerente')->group(function () {
            Route::post('mesas', [MesaController::class, 'store']);
            Route::put('mesas/{mesa}', [MesaController::class, 'update']);
            Route::delete('mesas/{mesa}', [MesaController::class, 'destroy']);
        });
        Route::post('mesas/{mesa}/status', [MesaController::class, 'atualizarStatus'])
            ->middleware('role:gerente|garcom');

        // Pedidos — garcom cria; chapeiro atualiza status; gerente/caixa visualizam
        Route::get('pedidos', [PedidoController::class, 'index']);
        Route::get('pedidos/{pedido}', [PedidoController::class, 'show']);
        Route::post('pedidos', [PedidoController::class, 'store'])
            ->middleware('role:gerente|garcom');
        Route::put('pedidos/{pedido}/status', [PedidoController::class, 'atualizarStatus'])
            ->middleware('role:gerente|garcom|chapeiro');
        Route::put('pedidos/{pedido}/itens/{item}/status', [PedidoController::class, 'atualizarStatusItem'])
            ->middleware('role:gerente|chapeiro');
        Route::delete('pedidos/{pedido}', [PedidoController::class, 'destroy'])
            ->middleware('role:gerente');

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

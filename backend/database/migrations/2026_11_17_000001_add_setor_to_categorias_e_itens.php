<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Setor de preparo: cada categoria vai para a cozinha ou para o bar.
// O item do pedido guarda uma cópia do setor no momento do pedido (mudar a categoria
// depois não move itens que já estão no KDS).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('categorias', function (Blueprint $table) {
            $table->enum('setor', ['cozinha', 'bar'])->default('cozinha')->after('descricao');
        });

        Schema::table('itens_pedido', function (Blueprint $table) {
            $table->enum('setor', ['cozinha', 'bar'])->default('cozinha')->after('status');
            $table->index('setor');
        });

        // Melhor palpite para dados existentes: categorias de bebidas vão para o bar.
        DB::table('categorias')->where('nome', 'like', '%bebida%')->update(['setor' => 'bar']);

        DB::table('itens_pedido')
            ->join('produtos', 'itens_pedido.produto_id', '=', 'produtos.id')
            ->join('categorias', 'produtos.categoria_id', '=', 'categorias.id')
            ->where('categorias.setor', 'bar')
            ->update(['itens_pedido.setor' => 'bar']);
    }

    public function down(): void
    {
        Schema::table('itens_pedido', function (Blueprint $table) {
            $table->dropIndex(['setor']);
            $table->dropColumn('setor');
        });

        Schema::table('categorias', function (Blueprint $table) {
            $table->dropColumn('setor');
        });
    }
};

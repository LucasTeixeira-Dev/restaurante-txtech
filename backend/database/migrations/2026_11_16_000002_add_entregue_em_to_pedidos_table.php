<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Data da venda: caixa, dashboard e relatórios passam a usar entregue_em em vez de updated_at,
// que muda a cada edição do pedido.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->timestamp('entregue_em')->nullable()->after('observacoes');
            $table->index('entregue_em');
        });

        // Pedidos entregues antes desta coluna: melhor estimativa disponível é o updated_at.
        DB::table('pedidos')
            ->where('status', 'entregue')
            ->update(['entregue_em' => DB::raw('updated_at')]);
    }

    public function down(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->dropIndex(['entregue_em']);
            $table->dropColumn('entregue_em');
        });
    }
};

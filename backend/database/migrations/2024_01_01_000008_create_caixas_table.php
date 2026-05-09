<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('caixas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('usuario_id')->constrained('usuarios')->restrictOnDelete();
            $table->foreignId('usuario_fechamento_id')->nullable()->constrained('usuarios')->nullOnDelete();
            $table->decimal('saldo_inicial', 10, 2)->default(0);
            $table->decimal('saldo_final', 10, 2)->nullable();
            $table->decimal('total_vendas', 10, 2)->default(0);
            $table->timestamp('aberto_em');
            $table->timestamp('fechado_em')->nullable();
            $table->text('observacoes')->nullable();
            $table->timestamps();

            $table->index('fechado_em');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('caixas');
    }
};

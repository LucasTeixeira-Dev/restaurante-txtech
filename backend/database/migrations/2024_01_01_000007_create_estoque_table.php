<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('estoque', function (Blueprint $table) {
            $table->id();
            $table->foreignId('produto_id')->unique()->constrained('produtos')->cascadeOnDelete();
            $table->decimal('quantidade', 10, 3)->default(0);
            $table->decimal('quantidade_minima', 10, 3)->default(0);
            $table->string('unidade', 20)->default('un');
            $table->timestamps();
        });

        Schema::create('estoque_movimentacoes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('produto_id')->constrained('produtos')->cascadeOnDelete();
            $table->foreignId('usuario_id')->nullable()->constrained('usuarios')->nullOnDelete();
            $table->enum('tipo', ['entrada', 'saida', 'ajuste']);
            $table->decimal('quantidade', 10, 3);
            $table->decimal('quantidade_anterior', 10, 3);
            $table->decimal('quantidade_posterior', 10, 3);
            $table->string('motivo')->nullable();
            $table->unsignedBigInteger('referencia_id')->nullable();
            $table->string('referencia_tipo')->nullable();
            $table->timestamps();

            $table->index(['produto_id', 'created_at']);
            $table->index('tipo');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('estoque_movimentacoes');
        Schema::dropIfExists('estoque');
    }
};

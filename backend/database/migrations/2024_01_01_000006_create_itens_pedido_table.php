<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('itens_pedido', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pedido_id')->constrained('pedidos')->cascadeOnDelete();
            $table->foreignId('produto_id')->constrained('produtos')->restrictOnDelete();
            $table->unsignedSmallInteger('quantidade');
            $table->decimal('preco_unitario', 10, 2);
            $table->decimal('subtotal', 10, 2);
            $table->enum('status', ['pendente', 'em_preparo', 'pronto', 'cancelado'])->default('pendente');
            $table->text('observacoes')->nullable();
            $table->timestamps();

            $table->index('pedido_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('itens_pedido');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pedidos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mesa_id')->nullable()->constrained('mesas')->nullOnDelete();
            $table->foreignId('usuario_id')->nullable()->constrained('usuarios')->nullOnDelete();
            $table->enum('status', ['aberto', 'em_preparo', 'pronto', 'entregue', 'cancelado'])->default('aberto');
            $table->decimal('total', 10, 2)->default(0);
            $table->text('observacoes')->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index('mesa_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pedidos');
    }
};

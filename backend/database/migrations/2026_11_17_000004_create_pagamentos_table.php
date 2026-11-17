<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Pagamentos parciais da conta: divisão entre pessoas e formas diferentes (Pix, maquininha, caixa).
// A conta só é quitada (e a mesa liberada) quando os pagamentos aprovados cobrem o total.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contas', function (Blueprint $table) {
            $table->unsignedTinyInteger('pessoas')->default(1)->after('status');
            // Taxa de serviço vem incluída; o cliente (ou a equipe) pode tirar antes do primeiro pagamento.
            $table->boolean('cobrar_taxa_servico')->default(true)->after('pessoas');
        });

        Schema::create('pagamentos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conta_id')->constrained('contas')->cascadeOnDelete();
            // Parte da divisão (1..pessoas). Null = valor avulso registrado pelo caixa.
            $table->unsignedTinyInteger('parte')->nullable();
            $table->decimal('valor', 10, 2);
            // Como foi pedido: Pix na tela, maquininha levada à mesa ou pagamento no caixa.
            $table->enum('metodo', ['pix', 'maquininha', 'caixa']);
            // Forma efetiva (na maquininha só se sabe ao confirmar: débito ou crédito).
            $table->enum('forma', ['dinheiro', 'debito', 'credito', 'pix'])->nullable();
            $table->enum('status', ['pendente', 'aprovado', 'cancelado', 'expirado'])->default('pendente');
            $table->enum('origem', ['tablet', 'caixa', 'garcom']);
            $table->decimal('valor_recebido', 10, 2)->nullable();
            $table->decimal('troco', 10, 2)->nullable();
            // Pix: dados da cobrança no provedor.
            $table->string('provedor', 40)->nullable();
            $table->string('referencia_externa', 100)->nullable()->unique();
            $table->text('pix_copia_e_cola')->nullable();
            $table->timestamp('expira_em')->nullable();
            $table->foreignId('caixa_id')->nullable()->constrained('caixas')->nullOnDelete();
            $table->foreignId('usuario_id')->nullable()->constrained('usuarios')->nullOnDelete();
            $table->timestamp('pago_em')->nullable();
            $table->timestamps();

            $table->index(['conta_id', 'status']);
            $table->index(['status', 'pago_em']);
        });

        // Contas já pagas viram um pagamento aprovado (relatórios por forma continuam batendo).
        foreach (DB::table('contas')->where('status', 'paga')->get() as $c) {
            DB::table('pagamentos')->insert([
                'conta_id' => $c->id,
                'parte' => 1,
                'valor' => $c->total,
                'metodo' => 'caixa',
                'forma' => $c->forma_pagamento,
                'status' => 'aprovado',
                'origem' => 'caixa',
                'valor_recebido' => $c->valor_recebido,
                'troco' => $c->troco,
                'caixa_id' => $c->caixa_id,
                'usuario_id' => $c->usuario_fechamento_id,
                'pago_em' => $c->paga_em,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('pagamentos');
        Schema::table('contas', function (Blueprint $table) {
            $table->dropColumn(['pessoas', 'cobrar_taxa_servico']);
        });
    }
};

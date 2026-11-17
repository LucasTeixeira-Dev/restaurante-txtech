<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Conta (comanda): junta todos os pedidos de uma mesa até o pagamento.
// Pedidos de balcão (sem mesa) ganham uma conta própria cada um.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mesa_id')->nullable()->constrained('mesas')->nullOnDelete();
            $table->enum('status', ['aberta', 'fechamento_solicitado', 'paga', 'cancelada'])->default('aberta');
            // Valores finais gravados no pagamento; enquanto aberta, o subtotal é calculado dos pedidos.
            $table->decimal('subtotal', 10, 2)->default(0);
            $table->decimal('taxa_servico', 10, 2)->default(0);
            $table->decimal('total', 10, 2)->default(0);
            $table->enum('forma_pagamento', ['dinheiro', 'debito', 'credito', 'pix'])->nullable();
            $table->decimal('valor_recebido', 10, 2)->nullable();
            $table->decimal('troco', 10, 2)->nullable();
            $table->foreignId('caixa_id')->nullable()->constrained('caixas')->nullOnDelete();
            $table->foreignId('usuario_fechamento_id')->nullable()->constrained('usuarios')->nullOnDelete();
            $table->timestamp('aberta_em');
            $table->timestamp('solicitada_em')->nullable();
            $table->timestamp('paga_em')->nullable();
            $table->timestamps();

            $table->index(['status', 'mesa_id']);
            $table->index('paga_em');
        });

        Schema::table('pedidos', function (Blueprint $table) {
            $table->foreignId('conta_id')->nullable()->after('mesa_id')->constrained('contas')->nullOnDelete();
        });

        $this->migrarPedidosExistentes();
    }

    public function down(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->dropConstrainedForeignId('conta_id');
        });
        Schema::dropIfExists('contas');
    }

    /**
     * Pedidos anteriores à conta:
     * - entregues: uma conta paga por pedido (mantém a receita histórica nos relatórios);
     * - ativos: uma conta aberta por mesa (ou por pedido, no balcão);
     * - cancelados: ficam sem conta.
     */
    private function migrarPedidosExistentes(): void
    {
        $agora = now();

        foreach (DB::table('pedidos')->where('status', 'entregue')->whereNull('deleted_at')->get() as $p) {
            $contaId = DB::table('contas')->insertGetId([
                'mesa_id' => $p->mesa_id,
                'status' => 'paga',
                'subtotal' => $p->total,
                'total' => $p->total,
                'aberta_em' => $p->created_at,
                'paga_em' => $p->entregue_em ?? $p->updated_at,
                'created_at' => $agora,
                'updated_at' => $agora,
            ]);
            DB::table('pedidos')->where('id', $p->id)->update(['conta_id' => $contaId]);
        }

        $ativos = DB::table('pedidos')
            ->whereIn('status', ['aberto', 'em_preparo', 'pronto'])
            ->whereNull('deleted_at')
            ->orderBy('created_at')
            ->get();

        $contaPorMesa = [];
        foreach ($ativos as $p) {
            if ($p->mesa_id && isset($contaPorMesa[$p->mesa_id])) {
                $contaId = $contaPorMesa[$p->mesa_id];
            } else {
                $contaId = DB::table('contas')->insertGetId([
                    'mesa_id' => $p->mesa_id,
                    'status' => 'aberta',
                    'aberta_em' => $p->created_at,
                    'created_at' => $agora,
                    'updated_at' => $agora,
                ]);
                if ($p->mesa_id) {
                    $contaPorMesa[$p->mesa_id] = $contaId;
                }
            }
            DB::table('pedidos')->where('id', $p->id)->update(['conta_id' => $contaId]);
        }
    }
};

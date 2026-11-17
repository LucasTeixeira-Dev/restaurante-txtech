<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Role;

// Autoatendimento: o tablet da mesa entra com um usuário de papel "mesa" ligado à mesa.
// Também cria o papel "bar" (KDS do bar).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('usuarios', function (Blueprint $table) {
            $table->foreignId('mesa_id')->nullable()->after('ativo')->constrained('mesas')->nullOnDelete();
        });

        Schema::table('mesas', function (Blueprint $table) {
            // Preenchido quando a mesa toca em "Chamar garçom"; limpo quando alguém atende.
            $table->timestamp('garcom_chamado_em')->nullable()->after('qr_code_token');
        });

        // Papéis são dados de que o código depende: criados aqui para valer também em produção.
        foreach (['bar', 'mesa'] as $papel) {
            Role::firstOrCreate(['name' => $papel, 'guard_name' => 'sanctum']);
        }
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function down(): void
    {
        Role::whereIn('name', ['bar', 'mesa'])->where('guard_name', 'sanctum')->delete();

        Schema::table('mesas', function (Blueprint $table) {
            $table->dropColumn('garcom_chamado_em');
        });

        Schema::table('usuarios', function (Blueprint $table) {
            $table->dropConstrainedForeignId('mesa_id');
        });
    }
};

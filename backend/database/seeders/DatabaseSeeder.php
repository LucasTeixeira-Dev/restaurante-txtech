<?php

namespace Database\Seeders;

use App\Models\Categoria;
use App\Models\Mesa;
use App\Models\Produto;
use App\Models\Usuario;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Papéis
        $papeis = ['gerente', 'garcom', 'chapeiro', 'caixa'];
        foreach ($papeis as $papel) {
            Role::firstOrCreate(['name' => $papel, 'guard_name' => 'sanctum']);
        }

        // Usuários padrão
        $usuarios = [
            ['nome' => 'Gerente', 'email' => 'gerente@restaurante.com', 'papel' => 'gerente'],
            ['nome' => 'Garçom', 'email' => 'garcom@restaurante.com', 'papel' => 'garcom'],
            ['nome' => 'Chapeiro', 'email' => 'chapeiro@restaurante.com', 'papel' => 'chapeiro'],
            ['nome' => 'Caixa', 'email' => 'caixa@restaurante.com', 'papel' => 'caixa'],
        ];

        foreach ($usuarios as $dados) {
            $usuario = Usuario::firstOrCreate(
                ['email' => $dados['email']],
                [
                    'nome' => $dados['nome'],
                    'senha' => Hash::make('senha123'),
                    'ativo' => true,
                ]
            );
            $usuario->syncRoles([$dados['papel']]);
        }

        // Categorias
        $categorias = [
            ['nome' => 'Lanches', 'descricao' => 'Hambúrgueres e sanduíches', 'ordem' => 1],
            ['nome' => 'Bebidas', 'descricao' => 'Refrigerantes, sucos e bebidas', 'ordem' => 2],
            ['nome' => 'Porções', 'descricao' => 'Batata frita, onion rings e acompanhamentos', 'ordem' => 3],
            ['nome' => 'Sobremesas', 'descricao' => 'Milkshakes, sorvetes e doces', 'ordem' => 4],
        ];

        foreach ($categorias as $dados) {
            Categoria::firstOrCreate(['nome' => $dados['nome']], $dados);
        }

        $lanchesCat = Categoria::where('nome', 'Lanches')->first();
        $bebidasCat = Categoria::where('nome', 'Bebidas')->first();

        // Produtos de exemplo
        $produtos = [
            [
                'categoria_id' => $lanchesCat->id,
                'nome' => 'X-Burguer',
                'descricao' => 'Hambúrguer artesanal com queijo, alface, tomate e molho especial',
                'preco' => 22.90,
                'disponivel' => true,
                'tempo_preparo' => 15,
            ],
            [
                'categoria_id' => $lanchesCat->id,
                'nome' => 'X-Bacon',
                'descricao' => 'Hambúrguer artesanal com bacon crocante, queijo cheddar e cebola caramelizada',
                'preco' => 26.90,
                'disponivel' => true,
                'tempo_preparo' => 18,
            ],
            [
                'categoria_id' => $lanchesCat->id,
                'nome' => 'X-Frango',
                'descricao' => 'Frango grelhado com maionese temperada, alface e tomate',
                'preco' => 21.90,
                'disponivel' => true,
                'tempo_preparo' => 15,
            ],
            [
                'categoria_id' => $bebidasCat->id,
                'nome' => 'Refrigerante',
                'descricao' => 'Lata 350ml — Coca-Cola, Guaraná ou Fanta',
                'preco' => 6.00,
                'disponivel' => true,
                'tempo_preparo' => 2,
            ],
            [
                'categoria_id' => $bebidasCat->id,
                'nome' => 'Suco Natural',
                'descricao' => 'Suco natural 300ml — Laranja, Limão ou Maracujá',
                'preco' => 9.00,
                'disponivel' => true,
                'tempo_preparo' => 5,
            ],
        ];

        foreach ($produtos as $dados) {
            Produto::firstOrCreate(['nome' => $dados['nome']], $dados);
        }

        // Mesas
        for ($i = 1; $i <= 10; $i++) {
            Mesa::firstOrCreate(
                ['numero' => $i],
                ['capacidade' => 4, 'status' => 'livre']
            );
        }
    }
}

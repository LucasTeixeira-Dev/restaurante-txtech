# Restaurante TxTech

Sistema profissional de gerenciamento para restaurantes — evolução do TCC original reescrito com stack moderna.

## Stack

| Camada | Tecnologias |
|---|---|
| **Backend** | Laravel 11 · PHP 8.2 · MySQL 8 · Redis · Sanctum · Spatie Permission |
| **Web** | React 18 · Vite · TypeScript · TailwindCSS · React Query · Zustand |
| **Mobile** | React Native · Expo SDK 51 · TypeScript · Zustand · expo-secure-store |
| **Infra** | Docker Compose · Mailpit |

## Módulos

1. Autenticação (4 papéis: gerente, garcom, chapeiro, caixa)
2. Usuários (CRUD — gerente)
3. Categorias de produtos
4. Produtos / Cardápio (imagem, preço, disponibilidade, estoque)
5. Mesas (status, QR Code token)
6. Pedidos (status: aberto → em_preparo → pronto → entregue / cancelado)
7. Itens de pedido
8. Estoque (movimentações de entrada/saída/ajuste)
9. Caixa (abertura/fechamento)
10. Relatórios (vendas, produtos, financeiro, estoque)

## Subir o ambiente

```bash
# Clonar e subir containers
docker-compose up -d

# Instalar dependências e rodar migrations + seed
docker-compose exec backend composer install
docker-compose exec backend php artisan key:generate
docker-compose exec backend php artisan migrate --seed
docker-compose exec backend php artisan storage:link

# Frontend Web
cd frontend/web && npm install && npm run dev

# Frontend Mobile
cd frontend/mobile && npm install && npx expo start
```

## Usuários padrão

| E-mail | Senha | Papel |
|---|---|---|
| `gerente@restaurante.com` | `senha123` | Gerente |
| `garcom@restaurante.com` | `senha123` | Garçom |
| `chapeiro@restaurante.com` | `senha123` | Chapeiro |
| `caixa@restaurante.com` | `senha123` | Caixa |

## URLs locais

| Serviço | URL |
|---|---|
| API Backend | http://localhost:8000/api/v1 |
| Frontend Web | http://localhost:3000 |
| Mailpit | http://localhost:8025 |
| MySQL | localhost:3306 |
| Redis | localhost:6379 |

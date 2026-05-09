# Checklist de Desenvolvimento — Restaurante TxTech

## Fase 1 — Estrutura Inicial ✅
- [x] Backend Laravel 11: Models, Migrations, Controllers, Requests, Resources, Seeder, Routes
- [x] Frontend Web: React 18 + Vite + TS, auth flow (login, authStore, PrivateRoute, AppLayout)
- [x] Frontend Mobile: Expo SDK 51, authStore com SecureStore, LoginScreen
- [x] Docker Compose: backend, web, mysql:8, redis:7, mailpit + healthchecks

---

## Fase 2 — Fluxo de Pedido Completo 🔥 (em andamento)

### Backend
- [x] PedidoController (CRUD + atualizar status + atualizar status do item)
- [x] MesaController (CRUD + atualizar status)
- [ ] `config/broadcasting.php`
- [ ] `app/Events/PedidoCriado.php`
- [ ] `app/Events/PedidoStatusAtualizado.php`
- [ ] `app/Events/ItemPedidoStatusAtualizado.php`
- [ ] Disparar eventos no PedidoController

### Frontend Web — Serviços
- [ ] `src/services/produtoService.ts`
- [ ] `src/services/mesaService.ts`
- [ ] `src/services/pedidoService.ts`
- [ ] `src/services/categoriaService.ts`

### Frontend Web — Componentes UI
- [ ] `src/components/ui/Badge.tsx`
- [ ] `src/components/ui/LoadingSpinner.tsx`
- [ ] `src/components/ui/EmptyState.tsx`
- [ ] `src/components/ui/Modal.tsx`
- [ ] `src/components/ui/ConfirmDialog.tsx`

### Frontend Web — Páginas
- [ ] `src/pages/mesas/MesasPage.tsx` (grid visual com status colorido)
- [ ] `src/pages/pedidos/PedidosPage.tsx` (tabs por status + listagem)
- [ ] `src/pages/pedidos/NovoPedidoPage.tsx` (seleção de mesa + cardápio + carrinho)
- [ ] `src/pages/pedidos/DetalhesPedidoPage.tsx` (itens + trocar status)
- [ ] Atualizar `src/App.tsx` com as novas rotas

---

## Fase 3 — KDS (Kitchen Display System) 🔥

### Backend
- [ ] Canal Pusher/broadcasting configurado
- [ ] Eventos disparados nos controllers

### Frontend Web
- [ ] Instalar `laravel-echo` + `pusher-js`
- [ ] `src/lib/echo.ts`
- [ ] `src/hooks/useEcho.ts`
- [ ] `src/pages/kds/KdsPage.tsx` (tela chapeiro: pedidos em tempo real, atualiza status por item)

---

## Fase 4 — Dashboard com Gráficos ⚡

### Backend
- [ ] `GET /v1/dashboard` — resumo: pedidos do dia, receita, mesas ocupadas, alertas de estoque

### Frontend Web
- [ ] `src/services/dashboardService.ts`
- [ ] `src/pages/dashboard/DashboardPage.tsx` (cards de KPIs + gráfico de vendas recharts)

---

## Fase 5 — CRUD Produtos e Categorias ⚡

### Backend
- [ ] `CategoriaController` (CRUD)
- [ ] Rota `/v1/categorias` com `role:gerente`

### Frontend Web
- [ ] `src/services/categoriaService.ts`
- [ ] `src/pages/produtos/ProdutosPage.tsx` (lista + modal criar/editar + upload de imagem)
- [ ] `src/pages/produtos/CategoriasPage.tsx`

---

## Fase 6 — Gestão de Caixa ⚡

### Frontend Web
- [ ] `src/services/caixaService.ts`
- [ ] `src/pages/caixa/CaixaPage.tsx` (abrir/fechar + histórico + resumo do dia)

---

## Fase 7 — Relatórios Visuais 📊

### Frontend Web
- [ ] `src/services/relatorioService.ts`
- [ ] `src/pages/relatorios/RelatoriosPage.tsx` (gráficos: vendas por dia, top produtos, financeiro, estoque)

---

## Fase 8 — CRUD Usuários ⚡

### Frontend Web
- [ ] `src/services/usuarioService.ts`
- [ ] `src/pages/usuarios/UsuariosPage.tsx` (lista + modal criar/editar com seleção de papel)

---

## Fase 9 — Estoque ⚡

### Frontend Web
- [ ] `src/services/estoqueService.ts`
- [ ] `src/pages/estoque/EstoquePage.tsx` (tabela + modal de movimentação + alertas de estoque baixo)

---

## Fase 10 — Mobile 📱

- [ ] Tela Cardápio (lista por categoria, busca)
- [ ] Scanner QR Code da mesa (expo-camera)
- [ ] Tela Novo Pedido mobile (carrinho nativo)
- [ ] Notificações push (expo-notifications: pedido pronto → garçom)
- [ ] Tela KDS mobile para chapeiro

---

## Legenda
| Símbolo | Significado |
|---|---|
| ✅ | Fase concluída |
| 🔥 | Alta prioridade — em andamento |
| ⚡ | Média prioridade |
| 📱 | Mobile |
| 📊 | Analytics |

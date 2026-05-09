# Checklist de Desenvolvimento — Restaurante TxTech

## Fase 1 — Estrutura Inicial ✅
- [x] Backend Laravel 11: Models, Migrations, Controllers, Requests, Resources, Seeder, Routes
- [x] Frontend Web: React 18 + Vite + TS, auth flow (login, authStore, PrivateRoute, AppLayout)
- [x] Frontend Mobile: Expo SDK 51, authStore com SecureStore, LoginScreen
- [x] Docker Compose: backend, web, mysql:8, redis:7, mailpit + healthchecks

---

## Fase 2 — Fluxo de Pedido Completo ✅
- [x] `config/broadcasting.php`
- [x] `app/Events/PedidoCriado.php`
- [x] `app/Events/PedidoStatusAtualizado.php`
- [x] `app/Events/ItemPedidoStatusAtualizado.php`
- [x] Disparar eventos no PedidoController
- [x] `src/services/produtoService.ts`
- [x] `src/services/mesaService.ts`
- [x] `src/services/pedidoService.ts`
- [x] `src/services/categoriaService.ts`
- [x] `src/components/ui/Badge.tsx`
- [x] `src/components/ui/LoadingSpinner.tsx`
- [x] `src/components/ui/EmptyState.tsx`
- [x] `src/components/ui/Modal.tsx`
- [x] `src/components/ui/ConfirmDialog.tsx`
- [x] `src/pages/mesas/MesasPage.tsx`
- [x] `src/pages/pedidos/PedidosPage.tsx`
- [x] `src/pages/pedidos/NovoPedidoPage.tsx`
- [x] `src/pages/pedidos/DetalhesPedidoPage.tsx`

---

## Fase 3 — KDS (Kitchen Display System) ✅
- [x] Canal Pusher/broadcasting configurado
- [x] Eventos disparados nos controllers
- [x] `laravel-echo` + `pusher-js` instalados
- [x] `src/lib/echo.ts`
- [x] `src/hooks/useEcho.ts`
- [x] `src/pages/kds/KdsPage.tsx` (tela chapeiro: pedidos em tempo real, atualiza status por item)

---

## Fase 4 — Dashboard com Gráficos ✅
- [x] `GET /v1/dashboard` — resumo: pedidos do dia, receita, mesas ocupadas, alertas de estoque
- [x] `src/services/dashboardService.ts`
- [x] `src/pages/dashboard/DashboardPage.tsx` (cards de KPIs + gráfico de vendas recharts)

---

## Fase 5 — CRUD Produtos e Categorias ✅
- [x] `CategoriaController` (CRUD)
- [x] Rota `/v1/categorias` com `role:gerente`
- [x] `src/services/categoriaService.ts`
- [x] `src/pages/produtos/ProdutosPage.tsx` (lista + modal criar/editar + upload de imagem)
- [x] `src/pages/produtos/CategoriasPage.tsx`

---

## Fase 6 — Gestão de Caixa ✅
- [x] `src/services/caixaService.ts`
- [x] `src/pages/caixa/CaixaPage.tsx` (abrir/fechar + histórico + resumo do dia)

---

## Fase 7 — Relatórios Visuais ✅
- [x] `src/services/relatorioService.ts`
- [x] `src/pages/relatorios/RelatoriosPage.tsx` (AreaChart receita, BarChart pedidos, top produtos, status estoque)

---

## Fase 8 — CRUD Usuários ✅
- [x] `src/services/usuarioService.ts`
- [x] `src/pages/usuarios/UsuariosPage.tsx` (lista + modal criar/editar com seleção de papel)

---

## Fase 9 — Estoque ✅
- [x] `src/services/estoqueService.ts`
- [x] `src/pages/estoque/EstoquePage.tsx` (tabela + modal de movimentação + alertas de estoque baixo)

---

## Fase 10 — Mobile ✅
- [x] Dashboard com KPIs reais e ações rápidas por papel
- [x] Scanner QR Code da mesa (expo-camera + CameraView)
- [x] Tela Novo Pedido: cardápio por categoria + carrinho nativo
- [x] Lista de pedidos com filtros por status + FAB novo pedido
- [x] Detalhes do pedido: avanço de status por item e por pedido
- [x] KDS mobile para chapeiro com polling 10s, fundo escuro, urgência visual
- [x] Zustand carrinhoStore para estado do carrinho entre telas
- [x] Serviços: cardapioService, mesaService, pedidoService
- [x] Componentes: LoadingView, EmptyView, StatusBadge
- [ ] Notificações push (expo-notifications: requer EAS Build)

---

## Legenda
| Símbolo | Significado |
|---|---|
| ✅ | Fase concluída |
| 🔥 | Alta prioridade — em andamento |
| ⚡ | Média prioridade |
| 📱 | Mobile |
| 📊 | Analytics |

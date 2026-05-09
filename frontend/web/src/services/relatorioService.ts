import { api } from '@/lib/api'

export interface FiltroRelatorio {
  data_inicio?: string
  data_fim?: string
}

export interface DadosVendas {
  data: string
  pedidos: number
  receita: number
}

export interface ProdutoVendido {
  nome: string
  total_vendido: number
  receita: number
}

export interface DadosFinanceiro {
  total_vendas: number
  ticket_medio: number
  total_pedidos: number
  por_forma_pagamento?: Record<string, number>
}

export interface ItemEstoqueRelatorio {
  produto: string
  quantidade: number
  quantidade_minima: number
  abaixo_minimo: boolean
}

export const relatorioService = {
  vendas: (filtro: FiltroRelatorio): Promise<DadosVendas[]> =>
    api.get('/relatorios/vendas', { params: filtro }).then((r) => r.data.data ?? r.data),

  produtosMaisVendidos: (filtro: FiltroRelatorio): Promise<ProdutoVendido[]> =>
    api.get('/relatorios/produtos-mais-vendidos', { params: filtro }).then((r) => r.data.data ?? r.data),

  financeiro: (filtro: FiltroRelatorio): Promise<DadosFinanceiro> =>
    api.get('/relatorios/financeiro', { params: filtro }).then((r) => r.data.data ?? r.data),

  estoque: (): Promise<ItemEstoqueRelatorio[]> =>
    api.get('/relatorios/estoque').then((r) => r.data.data ?? r.data),
}

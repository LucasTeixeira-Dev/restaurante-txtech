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

/** Receita = contas pagas no período (com taxa de serviço). */
export interface DadosFinanceiro {
  periodo: { inicio: string; fim: string }
  receita_total: number
  taxa_servico_total: number
  contas_pagas: number
  ticket_medio: number
  por_forma_pagamento: Record<string, number>
  pedidos_cancelados: number
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

import { api } from '@/lib/api'

export interface DashboardData {
  kpis: {
    pedidos_hoje: number
    receita_hoje: number
    pedidos_ativos: number
    mesas_ocupadas: number
    mesas_total: number
    estoque_baixo: number
    caixa_aberto: boolean
    saldo_inicial_caixa: number | null
  }
  vendas_semana: { data: string; pedidos: number; receita: number }[]
  top_produtos: { nome: string; total_vendido: number }[]
  pedidos_por_status: Record<string, number>
}

export const dashboardService = {
  async resumo(): Promise<DashboardData> {
    const { data } = await api.get<DashboardData>('/dashboard')
    return data
  },
}

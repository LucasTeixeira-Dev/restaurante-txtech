import { api } from '@/lib/api'
import type { Caixa } from '@/types'

export const caixaService = {
  listar: (): Promise<Caixa[]> =>
    api.get('/caixas').then((r) => r.data.data ?? r.data),

  atual: (): Promise<Caixa | null> =>
    api.get('/caixas/atual').then((r) => r.data.data ?? r.data).catch(() => null),

  abrir: (saldo_inicial: number): Promise<Caixa> =>
    api.post('/caixas/abrir', { saldo_inicial }).then((r) => r.data.data ?? r.data),

  fechar: (id: number, observacoes?: string): Promise<Caixa> =>
    api.post(`/caixas/${id}/fechar`, { observacoes }).then((r) => r.data.data ?? r.data),

  buscar: (id: number): Promise<Caixa> =>
    api.get(`/caixas/${id}`).then((r) => r.data.data ?? r.data),
}

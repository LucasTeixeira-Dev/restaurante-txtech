import { api } from '@/lib/api'
import type { Caixa } from '@/types'

export const caixaService = {
  listar: (): Promise<Caixa[]> =>
    api.get('/caixa').then((r) => r.data.data ?? r.data),

  atual: (): Promise<Caixa | null> =>
    api.get('/caixa/atual').then((r) => r.data.data ?? r.data).catch(() => null),

  abrir: (saldo_inicial: number): Promise<Caixa> =>
    api.post('/caixa/abrir', { saldo_inicial }).then((r) => r.data.data ?? r.data),

  fechar: (saldo_final: number, observacoes?: string): Promise<Caixa> =>
    api.post('/caixa/fechar', { saldo_final, observacoes }).then((r) => r.data.data ?? r.data),

  buscar: (id: number): Promise<Caixa> =>
    api.get(`/caixa/${id}`).then((r) => r.data.data ?? r.data),
}

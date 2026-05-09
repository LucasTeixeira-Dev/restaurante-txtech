import { api } from '@/lib/api'
import type { Categoria } from '@/types'

export const cardapioService = {
  listar: (): Promise<Categoria[]> =>
    api.get('/cardapio').then((r) => r.data),
}

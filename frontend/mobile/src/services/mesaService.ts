import { api } from '@/lib/api'
import type { Mesa } from '@/types'

export const mesaService = {
  listar: (): Promise<Mesa[]> =>
    api.get('/mesas').then((r) => r.data),

  buscarPorQr: (token: string): Promise<Mesa> =>
    api.get(`/mesas/qr/${token}`).then((r) => r.data),
}

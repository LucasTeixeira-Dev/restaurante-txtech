import { api } from '@/lib/api'
import type { Usuario } from '@/types'

export interface NovoUsuario {
  nome: string
  email: string
  senha: string
  papel: string
  ativo?: boolean
}

export interface AtualizarUsuario {
  nome?: string
  email?: string
  senha?: string
  papel?: string
  ativo?: boolean
}

export const usuarioService = {
  listar: (): Promise<Usuario[]> =>
    api.get('/usuarios').then((r) => r.data.data ?? r.data),

  buscar: (id: number): Promise<Usuario> =>
    api.get(`/usuarios/${id}`).then((r) => r.data.data ?? r.data),

  criar: (data: NovoUsuario): Promise<Usuario> =>
    api.post('/usuarios', data).then((r) => r.data.data ?? r.data),

  atualizar: (id: number, data: AtualizarUsuario): Promise<Usuario> =>
    api.put(`/usuarios/${id}`, data).then((r) => r.data.data ?? r.data),

  remover: (id: number): Promise<void> =>
    api.delete(`/usuarios/${id}`).then(() => undefined),
}

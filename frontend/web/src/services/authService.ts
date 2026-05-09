import { api } from '@/lib/api'
import type { Usuario } from '@/types'

interface LoginPayload {
  email: string
  senha: string
}

interface LoginResponse {
  token: string
  usuario: Usuario
}

export const authService = {
  async login(payload: LoginPayload): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>('/auth/login', payload)
    return data
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout')
  },

  async me(): Promise<Usuario> {
    const { data } = await api.get<Usuario>('/auth/me')
    return data
  },
}

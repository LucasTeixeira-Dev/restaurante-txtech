import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PapelUsuario, Usuario } from '@/types'

interface AuthState {
  token: string | null
  usuario: Usuario | null
  setAuth: (token: string, usuario: Usuario) => void
  setUsuario: (usuario: Usuario) => void
  logout: () => void
  isAuthenticated: () => boolean
  can: (papeis: PapelUsuario[]) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      usuario: null,

      setAuth: (token, usuario) => set({ token, usuario }),

      setUsuario: (usuario) => set({ usuario }),

      logout: () => set({ token: null, usuario: null }),

      isAuthenticated: () => {
        const { token, usuario } = get()
        return !!token && !!usuario
      },

      can: (papeis) => {
        const { usuario } = get()
        if (!usuario) return false
        return papeis.includes(usuario.papel)
      },
    }),
    {
      name: 'restaurante-auth',
      partialize: (state) => ({ token: state.token, usuario: state.usuario }),
    },
  ),
)

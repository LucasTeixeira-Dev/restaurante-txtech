import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import * as SecureStore from 'expo-secure-store'
import type { PapelUsuario, Usuario } from '@/types'

const secureStorage = {
  getItem: async (key: string) => {
    return SecureStore.getItemAsync(key)
  },
  setItem: async (key: string, value: string) => {
    await SecureStore.setItemAsync(key, value)
  },
  removeItem: async (key: string) => {
    await SecureStore.deleteItemAsync(key)
  },
}

interface AuthState {
  token: string | null
  usuario: Usuario | null
  setAuth: (token: string, usuario: Usuario) => void
  logout: () => Promise<void>
  isAuthenticated: () => boolean
  can: (papeis: PapelUsuario[]) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      usuario: null,

      setAuth: (token, usuario) => set({ token, usuario }),

      logout: async () => {
        set({ token: null, usuario: null })
      },

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
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({ token: state.token, usuario: state.usuario }),
    },
  ),
)

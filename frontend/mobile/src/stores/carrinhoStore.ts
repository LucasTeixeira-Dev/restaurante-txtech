import { create } from 'zustand'
import type { CartItem, Produto } from '@/types'

interface CarrinhoState {
  itens: CartItem[]
  mesaId: number | null
  mesaNumero: number | null
  adicionar: (produto: Produto) => void
  remover: (produtoId: number) => void
  alterarQuantidade: (produtoId: number, quantidade: number) => void
  alterarObservacoes: (produtoId: number, obs: string) => void
  definirMesa: (id: number | null, numero: number | null) => void
  limpar: () => void
  total: () => number
}

export const useCarrinhoStore = create<CarrinhoState>((set, get) => ({
  itens: [],
  mesaId: null,
  mesaNumero: null,

  adicionar: (produto) => {
    set((state) => {
      const existente = state.itens.find((i) => i.produto.id === produto.id)
      if (existente) {
        return {
          itens: state.itens.map((i) =>
            i.produto.id === produto.id
              ? { ...i, quantidade: i.quantidade + 1 }
              : i,
          ),
        }
      }
      return { itens: [...state.itens, { produto, quantidade: 1, observacoes: '' }] }
    })
  },

  remover: (produtoId) =>
    set((state) => ({ itens: state.itens.filter((i) => i.produto.id !== produtoId) })),

  alterarQuantidade: (produtoId, quantidade) => {
    if (quantidade <= 0) {
      get().remover(produtoId)
      return
    }
    set((state) => ({
      itens: state.itens.map((i) =>
        i.produto.id === produtoId ? { ...i, quantidade } : i,
      ),
    }))
  },

  alterarObservacoes: (produtoId, obs) =>
    set((state) => ({
      itens: state.itens.map((i) =>
        i.produto.id === produtoId ? { ...i, observacoes: obs } : i,
      ),
    })),

  definirMesa: (id, numero) => set({ mesaId: id, mesaNumero: numero }),

  limpar: () => set({ itens: [], mesaId: null, mesaNumero: null }),

  total: () => get().itens.reduce((s, i) => s + i.produto.preco * i.quantidade, 0),
}))

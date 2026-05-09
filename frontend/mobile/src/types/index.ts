export type PapelUsuario = 'gerente' | 'garcom' | 'chapeiro' | 'caixa'

export interface Usuario {
  id: number
  nome: string
  email: string
  ativo: boolean
  papel: PapelUsuario
  papeis: PapelUsuario[]
  criado_em: string
}

export interface Produto {
  id: number
  nome: string
  descricao: string | null
  preco: number
  disponivel: boolean
  tempo_preparo: number
  imagem_url: string | null
  categoria: { id: number; nome: string } | null
}

export interface Mesa {
  id: number
  numero: number
  capacidade: number
  status: 'livre' | 'ocupada' | 'reservada'
  qr_code_token: string
}

export type StatusPedido = 'aberto' | 'em_preparo' | 'pronto' | 'entregue' | 'cancelado'

export interface ItemPedido {
  id: number
  produto_id: number
  produto: { id: number; nome: string } | null
  quantidade: number
  preco_unitario: number
  subtotal: number
  status: 'pendente' | 'em_preparo' | 'pronto' | 'cancelado'
  observacoes: string | null
}

export interface Pedido {
  id: number
  status: StatusPedido
  total: number
  observacoes: string | null
  mesa: { id: number; numero: number } | null
  usuario: { id: number; nome: string } | null
  itens: ItemPedido[]
  criado_em: string
  atualizado_em: string
}

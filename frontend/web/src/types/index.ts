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

export interface Categoria {
  id: number
  nome: string
  descricao: string | null
  ativo: boolean
  ordem: number
}

export interface Produto {
  id: number
  nome: string
  descricao: string | null
  preco: number
  disponivel: boolean
  tempo_preparo: number
  controla_estoque: boolean
  imagem_url: string | null
  categoria: Pick<Categoria, 'id' | 'nome'> | null
  criado_em: string
}

export interface Mesa {
  id: number
  numero: number
  capacidade: number
  status: 'livre' | 'ocupada' | 'reservada'
  qr_code_token: string
  pedido_ativo: { id: number; status: string; total: number } | null
  criado_em: string
}

export type StatusPedido = 'aberto' | 'em_preparo' | 'pronto' | 'entregue' | 'cancelado'
export type StatusItemPedido = 'pendente' | 'em_preparo' | 'pronto' | 'cancelado'

export interface ItemPedido {
  id: number
  produto_id: number
  produto: Pick<Produto, 'id' | 'nome'> | null
  quantidade: number
  preco_unitario: number
  subtotal: number
  status: StatusItemPedido
  observacoes: string | null
}

export interface Pedido {
  id: number
  status: StatusPedido
  total: number
  observacoes: string | null
  mesa: Pick<Mesa, 'id' | 'numero'> | null
  usuario: Pick<Usuario, 'id' | 'nome'> | null
  itens: ItemPedido[]
  criado_em: string
  atualizado_em: string
}

export interface Caixa {
  id: number
  saldo_inicial: number
  saldo_final: number | null
  total_vendas: number | null
  aberto_em: string
  fechado_em: string | null
  observacoes: string | null
  usuario: Pick<Usuario, 'id' | 'nome'> | null
  usuario_fechamento: Pick<Usuario, 'id' | 'nome'> | null
}

export interface Estoque {
  id: number
  produto_id: number
  produto: Pick<Produto, 'id' | 'nome'> & { categoria: Pick<Categoria, 'id' | 'nome'> | null } | null
  quantidade: number
  quantidade_minima: number
  unidade: string
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
  links: {
    first: string
    last: string
    prev: string | null
    next: string | null
  }
}

export type PapelUsuario = 'gerente' | 'garcom' | 'chapeiro' | 'caixa' | 'bar' | 'mesa'

export type Setor = 'cozinha' | 'bar'

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
  produtos?: Produto[]
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
  pedido_ativo: { id: number; status: string; total: number } | null
  /** Conta em aberto da mesa (comanda). */
  conta?: {
    id: number
    status: string
    conta_solicitada: boolean
    subtotal: number
    restante: number
    /** Maquininha pedida pelo tablet (ou aviso de pagar no caixa) esperando a equipe. */
    pagamentos_pendentes: { id: number; metodo: 'pix' | 'maquininha' | 'caixa'; parte: number | null; valor: number }[]
  } | null
  garcom_chamado_em?: string | null
  autoatendimento?: { ativo: boolean; login: string | null }
}

export type StatusPedido = 'aberto' | 'em_preparo' | 'pronto' | 'entregue' | 'cancelado'
export type StatusItemPedido = 'pendente' | 'em_preparo' | 'pronto' | 'cancelado'

export interface ItemPedido {
  id: number
  produto_id: number
  produto: { id: number; nome: string } | null
  quantidade: number
  preco_unitario: number
  subtotal: number
  status: StatusItemPedido
  setor: Setor
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
  entregue_em?: string | null
}

/** Papéis que podem levar o pedido a cada status (espelha Pedido::PAPEIS_POR_STATUS na API). */
export const PAPEIS_POR_STATUS: Partial<Record<StatusPedido, PapelUsuario[]>> = {
  em_preparo: ['gerente', 'chapeiro', 'bar'],
  pronto: ['gerente', 'chapeiro', 'bar'],
  entregue: ['gerente', 'garcom'],
  cancelado: ['gerente', 'garcom'],
}

export interface CartItem {
  produto: Produto
  quantidade: number
  observacoes: string
}

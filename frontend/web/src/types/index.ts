export type PapelUsuario = 'gerente' | 'garcom' | 'chapeiro' | 'caixa' | 'bar' | 'mesa'

/** Papéis da equipe; "mesa" é o login do tablet de autoatendimento. */
export const PAPEIS_EQUIPE: PapelUsuario[] = ['gerente', 'garcom', 'chapeiro', 'caixa', 'bar']

export type Setor = 'cozinha' | 'bar'

export interface Usuario {
  id: number
  nome: string
  email: string
  ativo: boolean
  papel: PapelUsuario
  papeis: PapelUsuario[]
  /** Só no login de tablet (papel mesa). */
  mesa?: { id: number; numero: number } | null
  criado_em: string
}

export interface Categoria {
  id: number
  nome: string
  descricao: string | null
  setor: Setor
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
  conta?: {
    id: number
    status: StatusConta
    conta_solicitada: boolean
    subtotal: number
    restante: number
    solicitada_em: string | null
    /** Maquininha pedida pelo tablet / aviso de pagar no caixa, esperando a equipe. */
    pagamentos_pendentes: { id: number; metodo: MetodoPagamento; parte: number | null; valor: number }[]
  } | null
  garcom_chamado_em: string | null
  /** login só vem para o gerente */
  autoatendimento?: { ativo: boolean; login: string | null }
  criado_em: string
}

export type StatusConta = 'aberta' | 'fechamento_solicitado' | 'paga' | 'cancelada'
export type FormaPagamento = 'dinheiro' | 'debito' | 'credito' | 'pix'

export type MetodoPagamento = 'pix' | 'maquininha' | 'caixa'
export type StatusPagamento = 'pendente' | 'aprovado' | 'cancelado' | 'expirado'

export interface Pagamento {
  id: number
  /** Parte da divisão (1..pessoas); null = valor avulso recebido no caixa. */
  parte: number | null
  valor: number
  metodo: MetodoPagamento
  forma: FormaPagamento | null
  status: StatusPagamento
  origem: 'tablet' | 'caixa' | 'garcom'
  valor_recebido: number | null
  troco: number | null
  pix_copia_e_cola: string | null
  expira_em: string | null
  pago_em: string | null
  criado_em: string
}

export interface ParteConta {
  parte: number
  valor: number
  status: 'paga' | 'aguardando' | 'em_aberto'
  forma: FormaPagamento | null
  metodo: MetodoPagamento | null
}

export interface Conta {
  id: number
  status: StatusConta
  mesa: { id: number; numero: number } | null
  subtotal: number
  cobrar_taxa_servico: boolean
  taxa_servico_percentual: number
  taxa_servico: number
  total: number
  total_pago: number
  restante: number
  pessoas: number
  partes: ParteConta[]
  forma_pagamento: FormaPagamento | null
  valor_recebido: number | null
  troco: number | null
  pedidos_pendentes?: number
  pedidos?: Pedido[]
  pagamentos?: Pagamento[]
  aberta_em: string
  solicitada_em: string | null
  paga_em: string | null
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
  setor: Setor
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
  entregue_em?: string | null
  conta_id?: number | null
}

/** Papéis que podem levar o pedido a cada status (espelha Pedido::PAPEIS_POR_STATUS na API). */
export const PAPEIS_POR_STATUS: Partial<Record<StatusPedido, PapelUsuario[]>> = {
  em_preparo: ['gerente', 'chapeiro', 'bar'],
  pronto: ['gerente', 'chapeiro', 'bar'],
  entregue: ['gerente', 'garcom'],
  cancelado: ['gerente', 'garcom'],
}

export interface Caixa {
  id: number
  saldo_inicial: number
  saldo_final: number | null
  /** Contas recebidas neste caixa (parcial enquanto aberto). */
  total_vendas: number | null
  por_forma_pagamento?: Partial<Record<FormaPagamento, number>>
  contas_pagas?: number
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

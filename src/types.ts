export type CategoriaObra = 'realizada' | 'andamento' | '3d' | 'prancha'
export type TipoObra = 'residencial' | 'comercial' | 'multifamiliar' | 'industrial' | 'institucional'

export interface Foto {
  url: string
  alt: string
  legenda?: string | null
}

export interface Obra {
  id: string
  slug: string
  titulo: string
  categoria: CategoriaObra
  tipo: TipoObra
  /** Slugs de `SERVICOS` (src/data/servicos.ts). */
  servicos: string[]
  cidade: string | null
  ano: number | null
  descricao: string | null
  capa: Foto
  fotos: Foto[]
  destaque: boolean
  ordem: number
}

export interface Depoimento {
  id: string
  nome: string
  cargo: string | null
  empresa: string | null
  texto: string
  fotoUrl: string | null
}

export type PerfilLead = 'arquiteto' | 'construtora' | 'particular'
export type StatusLead = 'novo' | 'em_contato' | 'proposta_enviada' | 'fechado'

export interface Lead {
  id: string
  createdAt: string
  nome: string
  email: string | null
  telefone: string
  empresa: string | null
  perfil: PerfilLead
  servicos: string[]
  cidade: string | null
  areaM2: number | null
  mensagem: string | null
  anexoPath: string | null
  origem: string | null
  status: StatusLead
  observacoes: string | null
}

export const CATEGORIA_LABEL: Record<CategoriaObra, string> = {
  realizada: 'Realizada',
  andamento: 'Em andamento',
  '3d': '3D / Render',
  prancha: 'Prancha técnica',
}

export const TIPO_LABEL: Record<TipoObra, string> = {
  residencial: 'Residencial',
  comercial: 'Comercial',
  multifamiliar: 'Multifamiliar',
  industrial: 'Industrial',
  institucional: 'Institucional',
}

export const PERFIL_LABEL: Record<PerfilLead, string> = {
  arquiteto: 'Arquiteto(a)',
  construtora: 'Construtora / incorporadora',
  particular: 'Dono de obra / particular',
}

export const STATUS_LEAD_LABEL: Record<StatusLead, string> = {
  novo: 'Novo',
  em_contato: 'Em contato',
  proposta_enviada: 'Proposta enviada',
  fechado: 'Fechado',
}

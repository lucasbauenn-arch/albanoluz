/**
 * Tipos do banco (supabase/migrations/20260924120000_inicial.sql), no formato
 * gerado por `supabase gen types typescript`. Usar `type` (não `interface`):
 * o cliente exige tipos compatíveis com Record<string, unknown>.
 */
import type { CategoriaObra, PerfilLead, StatusLead, TipoObra } from '../types'

export type ObraRow = {
  id: string
  slug: string
  titulo: string
  categoria: CategoriaObra
  tipo: TipoObra
  servicos: string[]
  cidade: string | null
  ano: number | null
  descricao: string | null
  capa_url: string | null
  capa_alt: string | null
  destaque: boolean
  publicado: boolean
  ordem: number
  created_at: string
  updated_at: string
}

export type ObraInsert = {
  id?: string
  slug: string
  titulo: string
  categoria?: CategoriaObra
  tipo?: TipoObra
  servicos?: string[]
  cidade?: string | null
  ano?: number | null
  descricao?: string | null
  capa_url?: string | null
  capa_alt?: string | null
  destaque?: boolean
  publicado?: boolean
  ordem?: number
  created_at?: string
  updated_at?: string
}

export type ObraFotoRow = {
  id: string
  obra_id: string
  url: string
  alt: string
  legenda: string | null
  ordem: number
  created_at: string
  updated_at: string
}

export type ObraFotoInsert = {
  id?: string
  obra_id: string
  url: string
  alt?: string
  legenda?: string | null
  ordem?: number
  created_at?: string
  updated_at?: string
}

export type DepoimentoRow = {
  id: string
  nome: string
  cargo: string | null
  empresa: string | null
  texto: string
  foto_url: string | null
  publicado: boolean
  ordem: number
  created_at: string
  updated_at: string
}

export type DepoimentoInsert = {
  id?: string
  nome: string
  cargo?: string | null
  empresa?: string | null
  texto: string
  foto_url?: string | null
  publicado?: boolean
  ordem?: number
  created_at?: string
  updated_at?: string
}

export type LeadRow = {
  id: string
  created_at: string
  updated_at: string
  nome: string
  telefone: string
  email: string | null
  empresa: string | null
  perfil: PerfilLead | null
  servicos: string[]
  cidade: string | null
  area_m2: number | null
  mensagem: string | null
  anexo_path: string | null
  origem: string | null
  consentimento: boolean
  status: StatusLead
  observacoes: string | null
}

export type LeadInsert = {
  id?: string
  created_at?: string
  updated_at?: string
  nome: string
  telefone: string
  email?: string | null
  empresa?: string | null
  perfil?: PerfilLead | null
  servicos?: string[]
  cidade?: string | null
  area_m2?: number | null
  mensagem?: string | null
  anexo_path?: string | null
  origem?: string | null
  consentimento?: boolean
  status?: StatusLead
  observacoes?: string | null
}

export type AdminRow = {
  user_id: string
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      obras: {
        Row: ObraRow
        Insert: ObraInsert
        Update: Partial<ObraInsert>
        Relationships: []
      }
      obra_fotos: {
        Row: ObraFotoRow
        Insert: ObraFotoInsert
        Update: Partial<ObraFotoInsert>
        Relationships: [
          {
            foreignKeyName: 'obra_fotos_obra_id_fkey'
            columns: ['obra_id']
            isOneToOne: false
            referencedRelation: 'obras'
            referencedColumns: ['id']
          },
        ]
      }
      depoimentos: {
        Row: DepoimentoRow
        Insert: DepoimentoInsert
        Update: Partial<DepoimentoInsert>
        Relationships: []
      }
      leads: {
        Row: LeadRow
        Insert: LeadInsert
        Update: Partial<LeadInsert>
        Relationships: []
      }
      admins: {
        Row: AdminRow
        Insert: { user_id: string; created_at?: string }
        Update: { user_id?: string; created_at?: string }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

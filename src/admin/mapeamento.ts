/**
 * Conversão das linhas do banco (snake_case) para os tipos camelCase de
 * src/types.ts, acrescidos dos campos que só o painel usa.
 */
import type { Depoimento, Foto, Lead, Obra, PerfilLead } from '../types'
import type { DepoimentoRow, LeadRow, ObraFotoRow, ObraRow } from './database'

export type LeadAdmin = Omit<Lead, 'perfil'> & {
  /** Obrigatório no formulário, mas opcional no banco. */
  perfil: PerfilLead | null
  consentimento: boolean
}

export type FotoAdmin = Foto & { id: string; ordem: number }

export type ObraAdmin = Omit<Obra, 'fotos'> & {
  publicado: boolean
  fotos: FotoAdmin[]
}

export type DepoimentoAdmin = Depoimento & { publicado: boolean; ordem: number }

export function mapearLead(r: LeadRow): LeadAdmin {
  return {
    id: r.id,
    createdAt: r.created_at,
    nome: r.nome,
    email: r.email,
    telefone: r.telefone,
    empresa: r.empresa,
    perfil: r.perfil,
    servicos: r.servicos ?? [],
    cidade: r.cidade,
    areaM2: r.area_m2 === null ? null : Number(r.area_m2),
    mensagem: r.mensagem,
    anexoPath: r.anexo_path,
    origem: r.origem,
    status: r.status,
    observacoes: r.observacoes,
    consentimento: r.consentimento,
  }
}

export function mapearFoto(r: ObraFotoRow): FotoAdmin {
  return { id: r.id, url: r.url, alt: r.alt, legenda: r.legenda, ordem: r.ordem }
}

export function mapearObra(r: ObraRow, fotos: ObraFotoRow[] = []): ObraAdmin {
  return {
    id: r.id,
    slug: r.slug,
    titulo: r.titulo,
    categoria: r.categoria,
    tipo: r.tipo,
    servicos: r.servicos ?? [],
    cidade: r.cidade,
    ano: r.ano,
    descricao: r.descricao,
    capa: { url: r.capa_url ?? '', alt: r.capa_alt ?? '' },
    fotos: fotos.map(mapearFoto),
    destaque: r.destaque,
    ordem: r.ordem,
    publicado: r.publicado,
  }
}

export function mapearDepoimento(r: DepoimentoRow): DepoimentoAdmin {
  return {
    id: r.id,
    nome: r.nome,
    cargo: r.cargo,
    empresa: r.empresa,
    texto: r.texto,
    fotoUrl: r.foto_url,
    publicado: r.publicado,
    ordem: r.ordem,
  }
}

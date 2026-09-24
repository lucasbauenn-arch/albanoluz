import type { CategoriaObra, Depoimento, Obra, TipoObra } from '../types'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './env'

// Leituras públicas via REST (PostgREST) sem carregar o supabase-js no site,
// que fica restrito ao painel admin.

interface FotoRow {
  url: string
  alt: string
  legenda: string | null
  ordem: number
}

export interface ObraRow {
  id: string
  slug: string
  titulo: string
  categoria: CategoriaObra
  tipo: TipoObra
  servicos: string[] | null
  cidade: string | null
  ano: number | null
  descricao: string | null
  capa_url: string | null
  capa_alt: string | null
  destaque: boolean
  ordem: number
  obra_fotos?: FotoRow[]
}

interface DepoimentoRow {
  id: string
  nome: string
  cargo: string | null
  empresa: string | null
  texto: string
  foto_url: string | null
}

export function obraDeRow(r: ObraRow): Obra {
  const fotos = [...(r.obra_fotos ?? [])]
    .sort((a, b) => a.ordem - b.ordem)
    .map((f) => ({ url: f.url, alt: f.alt || r.titulo, legenda: f.legenda }))
  const capa = r.capa_url
    ? { url: r.capa_url, alt: r.capa_alt || r.titulo }
    : fotos[0] ?? { url: '/ilustracoes/hero-estrutura.svg', alt: r.titulo }
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
    capa,
    fotos: fotos.length ? fotos : [capa],
    destaque: r.destaque,
    ordem: r.ordem,
  }
}

async function rest<T>(caminho: string): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${caminho}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  })
  if (!res.ok) throw new Error(`Supabase respondeu ${res.status}`)
  return (await res.json()) as T
}

export async function buscarObras(): Promise<Obra[]> {
  const rows = await rest<ObraRow[]>(
    'obras?select=id,slug,titulo,categoria,tipo,servicos,cidade,ano,descricao,capa_url,capa_alt,destaque,ordem,obra_fotos(url,alt,legenda,ordem)&publicado=eq.true&order=ordem.asc,ano.desc',
  )
  return rows.map(obraDeRow)
}

export async function buscarDepoimentos(): Promise<Depoimento[]> {
  const rows = await rest<DepoimentoRow[]>(
    'depoimentos?select=id,nome,cargo,empresa,texto,foto_url&publicado=eq.true&order=ordem.asc',
  )
  return rows.map((r) => ({ ...r, fotoUrl: r.foto_url }))
}

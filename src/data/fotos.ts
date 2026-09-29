import type { SyntheticEvent } from 'react'
import type { Foto, Obra } from '../types'

/**
 * Fotos PROVISÓRIAS do Unsplash (licença livre), baixadas por
 * `scripts/baixar-fotos.mjs` — onde estão os IDs de origem de cada uma.
 * PENDENTE (PRD): trocar pelas fotos reais das obras da Albano Luz.
 */
export const FOTOS = {
  'laje-equipe-obra': 'Vista aérea de equipe de obra caminhando sobre laje de concreto recém-executada',
  'pilares-concreto': 'Pilares e lajes de concreto armado de edifício em construção',
  'fundacao-armaduras': 'Canteiro de obras com armaduras de fundação e guindaste ao fundo',
  'arquiteto-prancheta': 'Projetista desenhando planta técnica com escalímetro sobre a prancheta',
  'revisao-pranchas': 'Mãos revisando pranchas de projeto com calculadora sobre a mesa',
  'execucao-estrutura': 'Operários executando a estrutura de concreto de um edifício com escoramentos',
  'residencia-piscina': 'Residência contemporânea de dois pavimentos com grandes vidros e piscina',
  'residencia-branca': 'Residência branca com terraço e piscina na área externa',
  'edificio-residencial': 'Edifício residencial de fachada em tijolo aparente visto de baixo',
  'edificio-branco': 'Edifício multifamiliar de fachada branca e janelas em faixa',
  'galpao-docas': 'Galpão comercial com fachada cinza e docas de carga',
  'galpao-portoes': 'Fachada de galpão com portões de docas de carga',
  'galpao-cobertura-metalica': 'Galpão com estrutura e cobertura metálica em fase de acabamento',
  'clinica-fachada': 'Fachada de edifício comercial com revestimento claro e esquadrias verticais',
  'clinica-interior': 'Interior comercial amplo com forro linear e iluminação embutida',
  'sobrados-pergolado': 'Sobrados contemporâneos com pergolado e iluminação na fachada',
  'edificio-em-obra': 'Edifício de vários pavimentos com estrutura de concreto em execução',
  'armacao-laje': 'Operário trabalhando sobre laje com armaduras de pilares à espera',
  'armacao-pilares': 'Equipe de armadores montando armaduras de pilares em altura',
  'ampliacao-andaime': 'Ampliação de residência em alvenaria com andaimes na fachada',
  'ampliacao-fundos': 'Ampliação nos fundos de uma casa, com paredes de blocos e novas esquadrias',
  'residencia-terrea-obra': 'Residência moderna de concreto em construção, antes dos acabamentos',
  'render-residencia-jardim': 'Imagem renderizada de residência com fachada em pedra e jardim',
  'render-residencia-piscina': 'Imagem renderizada de residência térrea com piscina e deck',
  'render-sala-integrada': 'Render de sala de estar ampla com sofá e grandes aberturas',
  'render-fachada-edificio': 'Render de fachada contemporânea com volumes escuros e vegetação',
  'render-cozinha': 'Render de cozinha com marcenaria em madeira e ilha com banquetas',
  'render-sala-estar': 'Render de sala de estar clara com sofá branco e quadros',
} as const

export type NomeFoto = keyof typeof FOTOS

export const fotoUrl = (nome: NomeFoto) => `/fotos/${nome}.webp`

export function foto(nome: NomeFoto, legenda?: string): Foto {
  return { url: fotoUrl(nome), alt: FOTOS[nome], legenda: legenda ?? null }
}

/**
 * srcset para as fotos locais (1200px e 600px) e para as do bucket público "obras"
 * do Supabase (1920px e 600px: cada upload do painel grava também `<nome>-600.<ext>`
 * na mesma pasta). undefined para outras imagens.
 */
export function srcSetDe(url: string) {
  const local = url.match(/^\/fotos\/([\w-]+)\.webp$/)
  if (local) return `/fotos/${local[1]}-600.webp 600w, /fotos/${local[1]}.webp 1200w`
  const storage = url.match(/^(https?:\/\/[^/?#]+\/storage\/v1\/object\/public\/obras\/[^?#\s,]+)\.(webp|jpg)$/)
  if (storage) return `${storage[1]}-600.${storage[2]} 600w, ${storage[1]}.${storage[2]} 1920w`
  return undefined
}

/**
 * onError das imagens com srcset: se a variante -600 não existir (upload antigo ou
 * que falhou pela metade), tira o srcset para o navegador carregar o `src` original.
 */
export function semSrcSetSeFalhar(e: SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget
  if (img.srcset) img.removeAttribute('srcset')
}

/** Imagem genérica que src/lib/remoto.ts usa na obra do painel sem capa nem fotos. */
export const IMAGEM_SEM_FOTO = '/ilustracoes/hero-estrutura.svg'

/**
 * true quando a obra usa imagens provisórias do repositório (/fotos/ ou /ilustracoes/):
 * as obras ilustrativas de src/data/obras.ts e as do supabase/seed.sql. Obras reais
 * cadastradas no painel usam URLs do Storage. A imagem genérica de obra sem foto não conta.
 */
export function ehIlustrativa(obra: Obra) {
  return [obra.capa, ...obra.fotos].some((f) => f.url !== IMAGEM_SEM_FOTO && /^\/(fotos|ilustracoes)\//.test(f.url))
}

import type { Foto } from '../types'

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

/** srcset para as fotos locais (1200px e 600px); undefined para outras imagens. */
export function srcSetDe(url: string) {
  const m = url.match(/^\/fotos\/([\w-]+)\.webp$/)
  return m ? `/fotos/${m[1]}-600.webp 600w, /fotos/${m[1]}.webp 1200w` : undefined
}

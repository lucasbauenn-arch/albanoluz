import type { Foto } from '../types'

/**
 * Ilustrações técnicas geradas por `scripts/gerar-ilustracoes.mjs`.
 * São provisórias: devem dar lugar às fotos reais de obra, drone e renders
 * assim que o cliente enviar o material (pendência do PRD).
 */
export const ILUSTRACOES = {
  'hero-estrutura': 'Estrutura de concreto armado em perspectiva isométrica, com pilares, vigas e lajes',
  'fachada-residencia': 'Fachada de residência de dois pavimentos em desenho técnico',
  'fachada-multifamiliar': 'Fachada de edifício multifamiliar de quatro pavimentos em desenho técnico',
  'fachada-galpao': 'Fachada de galpão comercial com cobertura metálica em desenho técnico',
  'fachada-sobrado': 'Fachada de sobrados geminados em desenho técnico',
  'fachada-clinica': 'Fachada de clínica médica em desenho técnico',
  'fachada-edificio6': 'Fachada de edifício residencial de seis pavimentos em desenho técnico',
  'fachada-ampliacao': 'Fachada de residência com novo pavimento em ampliação',
  'fachada-terrea': 'Fachada de residência térrea em desenho técnico',
  'planta-residencia': 'Planta baixa de residência com ambientes e cotas',
  'planta-sobrado': 'Planta baixa do pavimento térreo de sobrados geminados',
  'planta-clinica': 'Planta baixa de clínica médica com consultórios e recepção',
  'planta-terrea': 'Planta baixa de residência térrea',
  'formas-residencia': 'Planta de formas estrutural de residência com pilares, vigas e lajes',
  'formas-multifamiliar': 'Planta de formas do pavimento tipo de edifício multifamiliar',
  'formas-galpao': 'Planta de formas de galpão com eixos e pilares',
  'formas-edificio6': 'Prancha de formas do pavimento tipo de edifício de seis pavimentos',
  'fundacao-multifamiliar': 'Planta de locação de fundação com blocos sobre estacas',
  'fundacao-galpao': 'Planta de locação de sapatas de galpão',
  'isometrico-multifamiliar': 'Estrutura de edifício multifamiliar em perspectiva isométrica',
  'isometrico-edificio6': 'Estrutura de edifício de seis pavimentos em execução, em perspectiva isométrica',
  'isometrico-ampliacao': 'Estrutura de ampliação de novo pavimento sobre residência existente',
  'render-residencia': 'Imagem renderizada da fachada de residência com materiais e paisagismo',
  'wireframe-residencia': 'Modelagem 3D em linhas da fachada da residência, antes da renderização',
  'render-multifamiliar': 'Imagem renderizada de edifício multifamiliar',
  'interior-sala': 'Render de ambiente interno: sala de estar integrada',
  'interior-cozinha': 'Render de ambiente interno: cozinha',
  'eletrico-planta': 'Planta de projeto elétrico com pontos, circuitos e quadro de distribuição',
  'hidraulico-isometrico': 'Isométrico de instalações hidráulicas de área molhada',
  'incendio-planta': 'Planta de projeto de combate a incêndio com rotas de fuga e extintores',
  'detalhe-executivo': 'Prancha de projeto executivo com cortes e detalhes construtivos',
} as const

export type NomeIlustracao = keyof typeof ILUSTRACOES

export const iluUrl = (nome: NomeIlustracao) => `/ilustracoes/${nome}.svg`

export function ilu(nome: NomeIlustracao, legenda?: string): Foto {
  return { url: iluUrl(nome), alt: ILUSTRACOES[nome], legenda: legenda ?? null }
}

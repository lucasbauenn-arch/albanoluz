import {
  Award,
  ClipboardCheck,
  Cpu,
  Eye,
  Gem,
  Handshake,
  Layers,
  Lightbulb,
  Ruler,
  Scale,
  ShieldCheck,
  Target,
  Telescope,
  Timer,
  TrendingDown,
  type LucideIcon,
} from 'lucide-react'
import { SITE } from '../config/site'

// Textos-base a partir do PRD. PENDENTE: revisar com os textos do portfólio em
// PDF (Quem somos p. 3, Missão/Visão/Valores p. 4, diferenciais p. 5,
// etapas p. 9, motivos p. 30), já com a revisão ortográfica pedida no PRD.

export interface ItemIcone {
  icone: LucideIcon
  titulo: string
  texto: string
}

export const QUEM_SOMOS = [
  `A Albano Luz Engenharia nasceu para unir segurança e economia na construção civil. Há mais de ${SITE.anosMercado} anos desenvolvemos cálculo estrutural para arquitetos e construtoras, com mais de ${SITE.projetosEntregues} projetos entregues: residências, sobrados, edifícios multifamiliares, comércios e galpões.`,
  'Além do projeto estrutural, cuidamos dos projetos complementares (fundação, elétrico, hidráulico, combate a incêndio, arquitetura e modelagem 3D) e executamos obras. Assim, o cliente conta com um único parceiro técnico do estudo inicial à entrega.',
  'Nosso trabalho começa pelo respeito ao projeto arquitetônico e termina no canteiro: acompanhamos a execução para garantir que a estrutura construída seja a estrutura calculada.',
]

export const MISSAO_VISAO_VALORES: (ItemIcone & { lista?: string[] })[] = [
  {
    icone: Target,
    titulo: 'Missão',
    texto:
      'Desenvolver projetos de engenharia seguros, econômicos e compatíveis com a arquitetura, que tornem cada obra mais simples de executar.',
  },
  {
    icone: Telescope,
    titulo: 'Visão',
    texto:
      'Ser referência em cálculo estrutural para arquitetos e construtoras, reconhecida pela precisão técnica e pela parceria em cada projeto.',
  },
  {
    icone: Gem,
    titulo: 'Valores',
    texto: 'O que orienta cada projeto que assinamos:',
    lista: [
      'Segurança em primeiro lugar',
      'Transparência com o cliente',
      'Rigor técnico e normativo',
      'Compromisso com prazos',
      'Respeito ao projeto arquitetônico',
    ],
  },
]

export const DIFERENCIAIS: ItemIcone[] = [
  {
    icone: ShieldCheck,
    titulo: 'Segurança',
    texto: 'Estruturas dimensionadas conforme as normas da ABNT, com verificação de cada elemento e memória de cálculo.',
  },
  {
    icone: Award,
    titulo: 'Experiência',
    texto: `Mais de ${SITE.anosMercado} anos e ${SITE.projetosEntregues} projetos em residências, comércios, edifícios multifamiliares e galpões.`,
  },
  {
    icone: TrendingDown,
    titulo: 'Otimização estrutural',
    texto: 'Seções e armaduras ajustadas ao necessário para reduzir o consumo de concreto e aço, sem abrir mão da segurança.',
  },
  {
    icone: Layers,
    titulo: 'Compatibilização perfeita',
    texto: 'A estrutura conversa com a arquitetura e as instalações, evitando interferências e retrabalho na obra.',
  },
]

export const ETAPAS = [
  {
    titulo: 'Análise estrutural',
    texto: 'Estudamos a arquitetura, o terreno e a sondagem para definir a melhor concepção estrutural.',
  },
  {
    titulo: 'Projeto personalizado',
    texto: 'Dimensionamos cada elemento para a sua obra, equilibrando segurança, custo e prazo.',
  },
  {
    titulo: 'Consultoria técnica',
    texto: 'Tiramos dúvidas do arquiteto, da construtora e do cliente durante todo o desenvolvimento.',
  },
  {
    titulo: 'Sustentabilidade',
    texto: 'Menos material desperdiçado significa obra mais econômica e menor impacto ambiental.',
  },
  {
    titulo: 'Acompanhamento em campo',
    texto: 'Visitas à obra para conferir formas, armaduras e a execução do que foi projetado.',
  },
]

export const MOTIVOS: ItemIcone[] = [
  {
    icone: Lightbulb,
    titulo: 'Expertise técnica',
    texto: `Engenharia estrutural é a nossa especialidade, com mais de ${SITE.projetosEntregues} projetos entregues.`,
  },
  {
    icone: ClipboardCheck,
    titulo: 'Planejamento e gestão',
    texto: 'Cada projeto tem escopo, cronograma e entregas definidos desde o início.',
  },
  {
    icone: Scale,
    titulo: 'Conformidade normativa',
    texto: 'Projetos de acordo com as normas da ABNT e as exigências de prefeituras, concessionárias e Corpo de Bombeiros.',
  },
  {
    icone: Ruler,
    titulo: 'Soluções personalizadas',
    texto: 'Nada de projeto de prateleira: cada estrutura é pensada para o terreno, o uso e o orçamento da obra.',
  },
  {
    icone: ShieldCheck,
    titulo: 'Redução de riscos',
    texto: 'Cálculo e verificação rigorosos evitam patologias, retrabalho e custos inesperados.',
  },
  {
    icone: Cpu,
    titulo: 'Inovação e tecnologia',
    texto: 'Softwares de cálculo e modelagem 3D para projetar com precisão e compatibilizar as disciplinas.',
  },
  {
    icone: Eye,
    titulo: 'Supervisão e qualidade',
    texto: 'Acompanhamento em campo para garantir que a obra siga o projeto.',
  },
  {
    icone: Timer,
    titulo: 'Economia de tempo e recursos',
    texto: 'Estruturas otimizadas reduzem o consumo de aço e concreto, e projetos claros aceleram a obra.',
  },
  {
    icone: Handshake,
    titulo: 'Responsabilidade e garantia',
    texto: 'Engenheiro responsável, ART registrada e suporte técnico durante a execução.',
  },
]

export const NUMEROS = [
  { valor: `+${SITE.anosMercado}`, rotulo: 'anos de mercado' },
  { valor: `+${SITE.projetosEntregues}`, rotulo: 'projetos entregues' },
  { valor: '8', rotulo: 'disciplinas de projeto' },
  { valor: '5', rotulo: 'frentes de execução de obras' },
]

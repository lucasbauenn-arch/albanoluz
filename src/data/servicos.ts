import {
  Blocks,
  Box,
  Building2,
  DraftingCompass,
  Droplets,
  FileStack,
  Flame,
  HardHat,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { SITE } from '../config/site'
import type { Foto } from '../types'
import { foto } from './fotos'
import { ilu } from './ilustracoes'

export interface Pergunta {
  pergunta: string
  resposta: string
}

export interface Servico {
  slug: string
  grupo: 'projeto' | 'execucao'
  nome: string
  nomeCurto: string
  icone: LucideIcon
  seoTitulo: string
  seoDescricao: string
  resumo: string
  descricao: string[]
  /** Subtipos (ex.: concreto armado x alvenaria estrutural) ou tipos de execução. */
  destaques?: { titulo: string; texto: string }[]
  beneficios: string[]
  entregaveis: string[]
  /** Foto principal da página (quando não há, usa a primeira de `imagens`). */
  foto?: Foto
  /** Pranchas, desenhos e renders exibidos na galeria de exemplos. */
  imagens: Foto[]
  faq: Pergunta[]
}

const cidade = SITE.cidade

// Textos-base escritos a partir do PRD. Os benefícios de Elétrico (p. 14),
// Hidráulico (p. 15), Executivo (p. 16) e 3D (p. 17) devem ser conferidos
// com o portfólio em PDF.
export const SERVICOS: Servico[] = [
  {
    slug: 'estrutural',
    grupo: 'projeto',
    nome: 'Projeto Estrutural',
    nomeCurto: 'Estrutural',
    icone: Building2,
    seoTitulo: `Cálculo e projeto estrutural em ${cidade}`,
    seoDescricao:
      'Cálculo estrutural em concreto armado e alvenaria estrutural para arquitetos e construtoras. Estruturas seguras, econômicas e compatíveis com a arquitetura.',
    resumo:
      'Cálculo estrutural em concreto armado e alvenaria estrutural, seguro, econômico e compatível com a arquitetura.',
    descricao: [
      'É o nosso principal serviço. Calculamos e detalhamos a estrutura de residências, sobrados, edifícios multifamiliares, comércios e galpões, em concreto armado convencional ou em alvenaria estrutural.',
      'Cada projeto é calculado e revisado, seguindo a NBR 6118 (estruturas de concreto) e a NBR 16868 (alvenaria estrutural). O resultado é uma estrutura que respeita o projeto arquitetônico e usa apenas o aço e o concreto necessários.',
    ],
    destaques: [
      {
        titulo: 'Concreto armado convencional',
        texto:
          'Pilares, vigas e lajes em concreto armado: a solução mais flexível para vãos livres, balanços e arquiteturas com formas variadas.',
      },
      {
        titulo: 'Alvenaria estrutural',
        texto:
          'As paredes de blocos são a própria estrutura. Indicada para edificações com plantas repetitivas, reduz formas, prazo e custo da obra.',
      },
    ],
    beneficios: [
      'Economia de concreto e aço com a otimização das seções',
      'Estrutura compatível com a arquitetura e as instalações',
      'Pranchas claras, fáceis de ler e executar na obra',
      'Suporte técnico durante a execução',
      'ART (Anotação de Responsabilidade Técnica) do projeto',
    ],
    entregaveis: [
      'Plantas de formas de todos os pavimentos',
      'Detalhamento de armaduras de pilares, vigas e lajes',
      'Memorial de cálculo e cargas na fundação',
      'Quantitativos de aço, concreto e formas',
    ],
    foto: foto('pilares-concreto'),
    imagens: [ilu('formas-edificio6'), ilu('isometrico-edificio6'), ilu('formas-residencia')],
    faq: [
      {
        pergunta: 'Qual a diferença entre concreto armado e alvenaria estrutural?',
        resposta:
          'No concreto armado, pilares e vigas sustentam a edificação e as paredes apenas fecham os vãos. Na alvenaria estrutural, as próprias paredes de blocos são a estrutura, o que reduz custos em plantas repetitivas, mas limita mudanças futuras. Indicamos a melhor opção depois de analisar a arquitetura.',
      },
      {
        pergunta: 'Vocês fazem a compatibilização com o projeto de arquitetura?',
        resposta:
          'Sim. A compatibilização faz parte do nosso método: posicionamos pilares e vigas respeitando o projeto arquitetônico e apontamos interferências com as instalações antes de a obra começar.',
      },
      {
        pergunta: 'Quanto tempo leva um projeto estrutural?',
        resposta:
          'Depende do porte e da complexidade da edificação. Informamos o prazo junto com a proposta, depois de analisar a arquitetura.',
      },
      {
        pergunta: 'O que preciso enviar para pedir um orçamento?',
        resposta:
          'O projeto arquitetônico (PDF ou DWG), a cidade da obra e, se houver, o laudo de sondagem do terreno. Com isso conseguimos avaliar o escopo e enviar a proposta.',
      },
    ],
  },
  {
    slug: 'fundacao',
    grupo: 'projeto',
    nome: 'Projeto de Fundação',
    nomeCurto: 'Fundação',
    icone: Blocks,
    seoTitulo: `Projeto de fundação em ${cidade}`,
    seoDescricao:
      'Projeto de fundação dimensionado a partir da sondagem: sapatas, radier, blocos sobre estacas e tubulões, conforme a NBR 6122.',
    resumo:
      'Fundações dimensionadas a partir da sondagem do terreno, com a solução mais adequada para cada solo e carga.',
    descricao: [
      'A fundação é a parte da obra que ninguém vê e a que mais pesa quando dá errado. Analisamos o laudo de sondagem (SPT) e as cargas da estrutura para escolher entre sapatas, radier, blocos sobre estacas ou tubulões, sempre de acordo com a NBR 6122.',
      'O projeto sai compatibilizado com o estrutural, com locação dos elementos, detalhamento de armaduras e quantitativos para orçar a obra.',
    ],
    beneficios: [
      'Solução definida pela sondagem, sem superdimensionamento',
      'Menor risco de recalques e fissuras',
      'Locação clara dos elementos para a equipe de obra',
      'Quantitativo de concreto e aço para orçar a obra',
    ],
    entregaveis: [
      'Planta de locação e cargas',
      'Formas e armaduras de sapatas, blocos ou radier',
      'Memorial de cálculo',
      'Lista de materiais',
    ],
    foto: foto('fundacao-armaduras'),
    imagens: [ilu('fundacao-multifamiliar'), ilu('fundacao-galpao')],
    faq: [
      {
        pergunta: 'Preciso de sondagem antes do projeto de fundação?',
        resposta:
          'Sim. A sondagem SPT mostra a resistência do solo em profundidade e é a base para escolher o tipo de fundação. Se você ainda não tem o laudo, orientamos como contratar.',
      },
      {
        pergunta: 'Qual tipo de fundação é mais barato?',
        resposta:
          'Depende do solo e das cargas. Em terrenos resistentes, sapatas ou radier costumam ser mais econômicos; em solos fracos, as estacas evitam recalques. O projeto compara as opções antes da decisão.',
      },
    ],
  },
  {
    slug: 'eletrico',
    grupo: 'projeto',
    nome: 'Projeto Elétrico',
    nomeCurto: 'Elétrico',
    icone: Zap,
    seoTitulo: `Projeto elétrico residencial e comercial em ${cidade}`,
    seoDescricao:
      'Projeto elétrico de baixa tensão conforme a NBR 5410, com quadros, circuitos, aterramento e aprovação na concessionária de energia.',
    resumo:
      'Instalações elétricas dimensionadas conforme a NBR 5410, com aprovação na concessionária de energia.',
    descricao: [
      'Projetamos a instalação elétrica de baixa tensão do padrão de entrada até cada tomada: quadros, circuitos, condutores, dispositivos de proteção e aterramento, conforme a NBR 5410.',
      'Também preparamos a documentação para ligação e aprovação junto à concessionária de energia, e deixamos a instalação pronta para os equipamentos que o cliente pretende usar.',
    ],
    beneficios: [
      'Circuitos dimensionados para a carga real, sem desperdício',
      'Proteção contra choques e surtos com DR e DPS',
      'Aprovação na concessionária de energia',
      'Previsão para ar-condicionado, energia solar e carregador de carro elétrico',
      'Compatibilização com a estrutura e a arquitetura',
    ],
    entregaveis: [
      'Plantas de pontos, circuitos e eletrodutos',
      'Diagramas unifilares e quadros de carga',
      'Detalhe do padrão de entrada',
      'Memorial descritivo e lista de materiais',
    ],
    imagens: [ilu('eletrico-planta')],
    faq: [
      {
        pergunta: 'O projeto elétrico é obrigatório?',
        resposta:
          'Em muitos casos a concessionária exige o projeto para liberar a ligação, e a NBR 5410 define os requisitos mínimos de segurança. Mesmo quando não é exigido, o projeto evita sobrecargas, choques e retrabalho.',
      },
      {
        pergunta: 'Vocês cuidam da aprovação na concessionária?',
        resposta: 'Sim. Preparamos a documentação e acompanhamos o processo até a aprovação.',
      },
    ],
  },
  {
    slug: 'hidraulico',
    grupo: 'projeto',
    nome: 'Projeto Hidráulico',
    nomeCurto: 'Hidráulico',
    icone: Droplets,
    seoTitulo: `Projeto hidráulico e hidrossanitário em ${cidade}`,
    seoDescricao:
      'Projeto hidrossanitário completo: água fria e quente, esgoto e águas pluviais, compatibilizado com a estrutura para evitar retrabalho.',
    resumo:
      'Água fria, água quente, esgoto e águas pluviais, projetados para funcionar bem e facilitar a manutenção.',
    descricao: [
      'Projetamos as instalações hidrossanitárias completas: água fria e quente (NBR 5626), esgoto sanitário (NBR 8160) e águas pluviais (NBR 10844).',
      'O traçado é compatibilizado com a estrutura para evitar furos improvisados em vigas e lajes, uma das causas mais comuns de retrabalho e patologias na obra.',
    ],
    beneficios: [
      'Pressão e vazão adequadas em todos os pontos',
      'Sem furos improvisados em vigas e lajes',
      'Reservatórios dimensionados para o consumo',
      'Manutenção facilitada com registros bem posicionados',
      'Lista de materiais para um orçamento preciso',
    ],
    entregaveis: [
      'Plantas de água fria, água quente, esgoto e pluvial',
      'Isométricos das áreas molhadas',
      'Dimensionamento de reservatórios',
      'Memorial descritivo e lista de materiais',
    ],
    imagens: [ilu('hidraulico-isometrico')],
    faq: [
      {
        pergunta: 'O projeto inclui aquecimento solar ou a gás?',
        resposta:
          'Sim. Prevemos o sistema de aquecimento definido com o cliente e o arquiteto, com as tubulações de água quente dimensionadas para ele.',
      },
      {
        pergunta: 'O hidráulico é compatibilizado com o estrutural?',
        resposta:
          'Sempre. Passagens por vigas e lajes são previstas no projeto estrutural, evitando cortes na obra.',
      },
    ],
  },
  {
    slug: 'incendio',
    grupo: 'projeto',
    nome: 'Projeto de Combate a Incêndio',
    nomeCurto: 'Combate a Incêndio',
    icone: Flame,
    seoTitulo: `Projeto de incêndio e AVCB em ${cidade}`,
    seoDescricao:
      'Projeto técnico de segurança contra incêndio para aprovação no Corpo de Bombeiros e obtenção do AVCB ou CLCB.',
    resumo:
      'Projeto de prevenção e combate a incêndio para aprovação no Corpo de Bombeiros e obtenção do AVCB ou CLCB.',
    descricao: [
      'Elaboramos o projeto técnico de segurança contra incêndio conforme as Instruções Técnicas do Corpo de Bombeiros: saídas de emergência, sinalização, iluminação de emergência, extintores, hidrantes e alarme, de acordo com a ocupação e a área da edificação.',
      'Acompanhamos o processo até a aprovação, etapa necessária para obter o AVCB (Auto de Vistoria do Corpo de Bombeiros) ou o CLCB (Certificado de Licença do Corpo de Bombeiros).',
    ],
    beneficios: [
      'Aprovação no Corpo de Bombeiros sem idas e vindas',
      'Medidas de segurança adequadas à ocupação do imóvel',
      'Documentação para AVCB ou CLCB',
      'Compatibilização com a arquitetura e a hidráulica',
    ],
    entregaveis: [
      'Plantas das medidas de segurança',
      'Memorial descritivo',
      'Dimensionamento de hidrantes e reserva de incêndio, quando exigidos',
      'Acompanhamento do processo de aprovação',
    ],
    imagens: [ilu('incendio-planta')],
    faq: [
      {
        pergunta: 'Qual a diferença entre AVCB e CLCB?',
        resposta:
          'O CLCB é um processo simplificado para edificações de menor risco e área; o AVCB é exigido nos demais casos e envolve vistoria. Avaliamos qual se aplica ao seu imóvel.',
      },
      {
        pergunta: 'Meu imóvel comercial precisa de projeto de incêndio?',
        resposta:
          'Na maioria dos casos, sim: a licença do Corpo de Bombeiros costuma ser exigida para funcionamento, alvarás e seguros. Envie a planta e a atividade do imóvel para avaliarmos.',
      },
    ],
  },
  {
    slug: 'arquitetura',
    grupo: 'projeto',
    nome: 'Projeto de Arquitetura',
    nomeCurto: 'Arquitetura',
    icone: DraftingCompass,
    seoTitulo: `Projeto de arquitetura residencial e comercial em ${cidade}`,
    seoDescricao:
      'Projeto arquitetônico do estudo preliminar ao projeto legal para aprovação na prefeitura, desenvolvido junto com a estrutura.',
    resumo: 'Do estudo preliminar ao projeto legal para aprovação na prefeitura, pensado junto com a estrutura.',
    descricao: [
      'Desenvolvemos projetos arquitetônicos residenciais e comerciais: estudo preliminar, anteprojeto, projeto legal para aprovação na prefeitura e projeto executivo.',
      'Como a mesma equipe cuida da estrutura, a arquitetura já nasce viável e econômica de construir.',
    ],
    beneficios: [
      'Arquitetura pensada junto com a estrutura',
      'Projeto legal para aprovação na prefeitura',
      'Melhor aproveitamento do terreno dentro da legislação',
      'Visualização em 3D antes de construir',
    ],
    entregaveis: [
      'Estudo preliminar e anteprojeto',
      'Projeto legal para aprovação',
      'Plantas, cortes e fachadas',
      'Imagens 3D do projeto',
    ],
    foto: foto('arquiteto-prancheta'),
    imagens: [ilu('planta-residencia'), ilu('fachada-residencia')],
    faq: [
      {
        pergunta: 'Vocês fazem a aprovação na prefeitura?',
        resposta: 'Sim. Preparamos o projeto legal e acompanhamos o processo de aprovação.',
      },
      {
        pergunta: 'Já tenho arquiteto. Posso contratar só os projetos complementares?',
        resposta:
          'Claro. Grande parte dos nossos clientes são escritórios de arquitetura, e nosso trabalho é desenvolver a estrutura e as instalações respeitando o projeto deles.',
      },
    ],
  },
  {
    slug: 'executivo',
    grupo: 'projeto',
    nome: 'Projeto Executivo',
    nomeCurto: 'Executivo',
    icone: FileStack,
    seoTitulo: 'Projeto executivo de obras',
    seoDescricao:
      'Projeto executivo com plantas, cortes, detalhes construtivos e especificações compatibilizados, para uma obra sem improvisos.',
    resumo: 'O detalhamento completo que a obra precisa para ser executada sem improvisos.',
    descricao: [
      'O projeto executivo reúne tudo o que a equipe de obra precisa: plantas detalhadas, cortes, paginações, detalhes construtivos e especificações de materiais, compatibilizados entre si.',
      'É o que transforma o projeto aprovado em uma obra previsível, com orçamento e cronograma confiáveis.',
    ],
    beneficios: [
      'Menos improviso e retrabalho na obra',
      'Orçamento mais preciso, com quantitativos reais',
      'Todas as disciplinas compatibilizadas',
      'Detalhes construtivos claros para a equipe',
    ],
    entregaveis: [
      'Plantas e cortes detalhados',
      'Detalhes construtivos e paginações',
      'Especificação de materiais e acabamentos',
      'Relatório de compatibilização entre disciplinas',
    ],
    foto: foto('revisao-pranchas'),
    imagens: [ilu('detalhe-executivo'), ilu('planta-sobrado')],
    faq: [
      {
        pergunta: 'Qual a diferença entre projeto legal e projeto executivo?',
        resposta:
          'O projeto legal é o que a prefeitura aprova. O executivo é o que a obra constrói: traz todos os detalhes, medidas e especificações de que a equipe precisa.',
      },
    ],
  },
  {
    slug: 'modelagem-3d',
    grupo: 'projeto',
    nome: 'Modelagem 3D e Maquete Eletrônica',
    nomeCurto: 'Modelagem 3D',
    icone: Box,
    seoTitulo: 'Modelagem 3D e maquete eletrônica',
    seoDescricao:
      'Modelagem 3D e imagens realistas de fachadas e interiores para aprovar decisões e apresentar o empreendimento antes de construir.',
    resumo:
      'Veja o projeto pronto antes de construir: modelagem 3D e imagens realistas de fachadas e interiores.',
    descricao: [
      'Transformamos o projeto em um modelo 3D e em imagens realistas, com materiais, iluminação e paisagismo.',
      'É a melhor forma de aprovar decisões com o cliente, detectar conflitos entre disciplinas e apresentar o empreendimento para venda.',
    ],
    beneficios: [
      'Decisões aprovadas antes da obra, sem surpresas',
      'Imagens para apresentar e vender o empreendimento',
      'Detecção de conflitos entre disciplinas no modelo',
      'Renderizações de fachadas e ambientes internos',
    ],
    entregaveis: [
      'Modelo 3D do projeto',
      'Imagens renderizadas de fachada',
      'Imagens de ambientes internos',
    ],
    imagens: [foto('render-sala-integrada'), foto('render-cozinha'), foto('render-residencia-piscina'), ilu('render-multifamiliar')],
    faq: [
      {
        pergunta: 'Preciso ter o projeto arquitetônico pronto?',
        resposta:
          'Não necessariamente. Podemos modelar a partir de um projeto existente ou desenvolver o modelo junto com a arquitetura.',
      },
      {
        pergunta: 'Posso usar as imagens para vender as unidades?',
        resposta:
          'Sim. As imagens são entregues em alta resolução, prontas para material de vendas, redes sociais e placas de obra.',
      },
    ],
  },
  {
    slug: 'execucao-de-obras',
    grupo: 'execucao',
    nome: 'Execução de Obras',
    nomeCurto: 'Execução de obras',
    icone: HardHat,
    seoTitulo: `Execução de obras em ${cidade}`,
    seoDescricao:
      'Execução de fundações, obras comerciais e industriais, ampliações e manutenção civil, com engenheiro responsável e controle técnico.',
    resumo:
      'Executamos a obra com o mesmo rigor do projeto: fundações, obras comerciais e industriais, ampliações e manutenção civil.',
    descricao: [
      'Além de projetar, executamos. Quem calculou a estrutura acompanha a obra, confere armaduras e formas e garante que o que foi projetado seja construído.',
      'Trabalhamos com cronograma e orçamento definidos antes do início, e com controle técnico de materiais e de cada etapa.',
    ],
    destaques: [
      {
        titulo: 'Fundação',
        texto: 'Execução de sapatas, radier, blocos e estacas conforme o projeto, com controle de concreto e armaduras.',
      },
      {
        titulo: 'Obra comercial',
        texto: 'Lojas, salas e edifícios comerciais executados com planejamento de prazo e orçamento.',
      },
      {
        titulo: 'Obra industrial',
        texto: 'Galpões e estruturas industriais, com atenção a vãos livres, pisos e prazos curtos.',
      },
      {
        titulo: 'Ampliações',
        texto: 'Novos pavimentos e ambientes, com verificação da estrutura existente antes de construir.',
      },
      {
        titulo: 'Manutenção civil',
        texto: 'Tratamento de fissuras e infiltrações, reforço estrutural e reparos em geral.',
      },
    ],
    beneficios: [
      'Quem projetou acompanha a execução',
      'Controle técnico de materiais e etapas',
      'Cronograma e orçamento definidos antes do início',
      'Engenheiro responsável pela execução',
    ],
    entregaveis: [
      'Planejamento e cronograma da obra',
      'Gestão de equipe e de materiais',
      'Relatórios de acompanhamento',
      'Entrega com documentação técnica',
    ],
    foto: foto('execucao-estrutura'),
    imagens: [foto('armacao-pilares'), foto('armacao-laje'), foto('ampliacao-andaime'), ilu('isometrico-ampliacao')],
    faq: [
      {
        pergunta: 'Vocês executam obras projetadas por outros escritórios?',
        resposta:
          'Podemos avaliar. Entre em contato com os projetos em mãos para analisarmos o escopo e a viabilidade.',
      },
      {
        pergunta: 'Fazem reforço de estruturas existentes?',
        resposta:
          'Sim. Avaliamos a estrutura, identificamos a causa do problema e projetamos e executamos o reforço necessário.',
      },
    ],
  },
]

export const SERVICOS_PROJETO = SERVICOS.filter((s) => s.grupo === 'projeto')
export const SERVICO_EXECUCAO = SERVICOS.find((s) => s.grupo === 'execucao')!

export const servicoPorSlug = (slug: string | undefined) => SERVICOS.find((s) => s.slug === slug)

export const nomeServico = (slug: string) => servicoPorSlug(slug)?.nomeCurto ?? slug

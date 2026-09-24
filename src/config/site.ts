/**
 * Dados institucionais da Albano Luz Engenharia.
 *
 * Itens marcados com PENDENTE vêm da lista de pendências do PRD e precisam
 * ser confirmados com o cliente antes da publicação.
 */
export const SITE = {
  nome: 'Albano Luz Engenharia',
  nomeCurto: 'Albano Luz',
  url: 'https://albanoluz.com',
  descricao:
    'Cálculo estrutural e projetos complementares para arquitetos, construtoras e donos de obra. Mais de 700 projetos entregues com segurança e economia.',

  whatsapp: '5511932742355',
  whatsappExibicao: '(11) 93274-2355',
  email: 'albano.luzengenharia@gmail.com',
  // PENDENTE: no PDF os ícones de site e Instagram estão trocados; confirmar o @.
  instagram: 'albanoluz.insta',

  // PENDENTE: cidade(s) de atuação. O DDD 11 sugere São Paulo.
  cidade: 'São Paulo',
  uf: 'SP',
  areaAtendida: 'São Paulo e região',

  anosMercado: 7,
  projetosEntregues: 700,

  // PENDENTE: CNPJ e dados do responsável técnico.
  cnpj: null as string | null,
  responsavel: {
    nome: null as string | null,
    titulo: 'Engenheiro civil responsável técnico',
    crea: null as string | null,
    bio: null as string | null,
    foto: null as string | null,
  },
} as const

export const instagramUrl = `https://instagram.com/${SITE.instagram}`
export const emailUrl = `mailto:${SITE.email}`

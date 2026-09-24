import { createContext, useContext, useEffect } from 'react'
import { SITE, instagramUrl } from '../config/site'

export interface HeadData {
  title: string
  description: string
  /** Caminho canônico, ex.: "/servicos/estrutural". */
  path: string
  image?: string
  noindex?: boolean
  type?: 'website' | 'article'
  jsonLd?: object[]
}

/** No servidor (pré-renderização) a página registra aqui os dados do <head>. */
export const HeadContext = createContext<{ head?: HeadData } | null>(null)

const OG_PADRAO = `${SITE.url}/og-image.png`

export function tituloCompleto(title: string) {
  return title.includes(SITE.nomeCurto) ? title : `${title} | ${SITE.nome}`
}

export const urlAbsoluta = (path: string) => (path.startsWith('http') ? path : `${SITE.url}${path}`)

/** Schema.org da empresa, presente em todas as páginas. */
export function schemaEmpresa() {
  return {
    '@context': 'https://schema.org',
    '@type': ['ProfessionalService', 'LocalBusiness'],
    '@id': `${SITE.url}/#empresa`,
    name: SITE.nome,
    description: SITE.descricao,
    url: SITE.url,
    logo: `${SITE.url}/icon-512.png`,
    image: OG_PADRAO,
    telephone: '+55 11 93274-2355',
    email: SITE.email,
    areaServed: SITE.areaAtendida,
    address: {
      '@type': 'PostalAddress',
      addressLocality: SITE.cidade,
      addressRegion: SITE.uf,
      addressCountry: 'BR',
    },
    sameAs: [instagramUrl],
    knowsAbout: [
      'Cálculo estrutural',
      'Projeto estrutural',
      'Projeto de fundação',
      'Alvenaria estrutural',
      'Projeto elétrico',
      'Projeto hidráulico',
      'Projeto de combate a incêndio',
      'AVCB',
    ],
  }
}

export function schemaBreadcrumb(itens: { nome: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: itens.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.nome,
      item: urlAbsoluta(item.path),
    })),
  }
}

const escaparAttr = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const escaparTexto = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const jsonSeguro = (obj: object) => JSON.stringify(obj).replace(/</g, '\\u003c')

/** Tags do <head> em HTML, usadas na pré-renderização. */
export function renderHeadTags(h: HeadData): string {
  const title = tituloCompleto(h.title)
  const url = urlAbsoluta(h.path)
  const image = h.image ? urlAbsoluta(h.image) : OG_PADRAO
  const jsonLd = [schemaEmpresa(), ...(h.jsonLd ?? [])]
  return [
    `<title>${escaparTexto(title)}</title>`,
    `<meta name="description" content="${escaparAttr(h.description)}">`,
    h.noindex ? `<meta name="robots" content="noindex, nofollow">` : '',
    `<link rel="canonical" href="${url}">`,
    `<meta property="og:type" content="${h.type ?? 'website'}">`,
    `<meta property="og:site_name" content="${SITE.nome}">`,
    `<meta property="og:locale" content="pt_BR">`,
    `<meta property="og:title" content="${escaparAttr(title)}">`,
    `<meta property="og:description" content="${escaparAttr(h.description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta property="og:image" content="${image}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    ...jsonLd.map((j) => `<script type="application/ld+json">${jsonSeguro(j)}</script>`),
  ]
    .filter(Boolean)
    .join('\n    ')
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string | null) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (content === null) {
    el?.remove()
    return
  }
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function aplicarHead(h: HeadData) {
  const title = tituloCompleto(h.title)
  const url = urlAbsoluta(h.path)
  document.title = title
  upsertMeta('name', 'description', h.description)
  upsertMeta('name', 'robots', h.noindex ? 'noindex, nofollow' : null)
  upsertMeta('property', 'og:title', title)
  upsertMeta('property', 'og:description', h.description)
  upsertMeta('property', 'og:url', url)
  upsertMeta('property', 'og:type', h.type ?? 'website')
  upsertMeta('property', 'og:image', h.image ? urlAbsoluta(h.image) : OG_PADRAO)

  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!canonical) {
    canonical = document.createElement('link')
    canonical.rel = 'canonical'
    document.head.appendChild(canonical)
  }
  canonical.href = url

  document.head.querySelectorAll('script[type="application/ld+json"]').forEach((s) => s.remove())
  for (const j of [schemaEmpresa(), ...(h.jsonLd ?? [])]) {
    const s = document.createElement('script')
    s.type = 'application/ld+json'
    s.textContent = JSON.stringify(j)
    document.head.appendChild(s)
  }
}

export function Seo(props: HeadData) {
  const ctx = useContext(HeadContext)
  if (ctx) ctx.head = props

  const chave = JSON.stringify(props)
  useEffect(() => {
    aplicarHead(JSON.parse(chave) as HeadData)
  }, [chave])

  return null
}

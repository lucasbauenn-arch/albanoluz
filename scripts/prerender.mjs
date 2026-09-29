// Pré-renderiza as páginas públicas em HTML estático (SEO) depois do build.
// Uso: npm run build  (vite build → vite build --ssr → este script)
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(raiz, 'dist')
const distSsr = path.join(raiz, 'dist-ssr')

const ssr = await import(pathToFileURL(path.join(distSsr, 'entry-server.js')).href)
const { render, renderHeadTags, SERVICOS, OBRAS_LOCAIS, SITE, supabaseConfigurado, buscarObras, buscarDepoimentos } = ssr

// 1. Conteúdo dinâmico: Supabase quando configurado; senão, obras ilustrativas locais.
let dados = { obras: OBRAS_LOCAIS, depoimentos: [], fonte: 'local' }
if (supabaseConfigurado) {
  // Se o banco estiver configurado e falhar, o build falha: melhor manter o deploy
  // anterior do que publicar o site com as obras ilustrativas.
  const [obras, depoimentos] = await Promise.all([buscarObras(), buscarDepoimentos()])
  dados = { obras, depoimentos, fonte: 'supabase' }
  console.log(`Supabase: ${obras.length} obras e ${depoimentos.length} depoimentos publicados.`)
  // Banco sem obra publicada (seed não rodou ou tudo em rascunho): o build sairia sem
  // portfólio, sem as páginas das obras e sem elas no sitemap. Só segue se for pedido.
  if (obras.length === 0) {
    if (process.env.PERMITIR_PORTFOLIO_VAZIO !== '1') {
      console.error(
        [
          '',
          'ERRO: o Supabase está configurado (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY), mas não há nenhuma obra publicada.',
          'Provavelmente o seed (supabase/seed.sql) ainda não rodou no banco, ou nenhuma obra está marcada como publicada no painel.',
          'Publicar este build tiraria do ar o portfólio, as páginas /portfolio/<slug> e as obras do sitemap.',
          'Para publicar mesmo assim, defina a variável de ambiente PERMITIR_PORTFOLIO_VAZIO=1',
          "(ex.: PERMITIR_PORTFOLIO_VAZIO=1 npm run build; no PowerShell: $env:PERMITIR_PORTFOLIO_VAZIO='1'; npm run build).",
          '',
        ].join('\n'),
      )
      process.exit(1)
    }
    console.warn('PERMITIR_PORTFOLIO_VAZIO=1: gerando o site com o portfólio vazio.')
  }
} else {
  console.warn('Supabase não configurado: usando obras ilustrativas de src/data/obras.ts.')
}

// 2. Template gerado pelo vite build + pré-carregamento das fontes principais.
const template = await fs.readFile(path.join(dist, 'index.html'), 'utf8')
const assets = await fs.readdir(path.join(dist, 'assets'))
const fontes = assets.filter((f) => /^(cormorant-garamond-latin-600-normal|inter-latin-wght-normal)-.*\.woff2$/.test(f))
const preloads = fontes
  .map((f) => `<link rel="preload" href="/assets/${f}" as="font" type="font/woff2" crossorigin>`)
  .join('\n    ')

const scriptDados = `<script>window.__AL_DADOS__=${JSON.stringify(dados).replace(/</g, '\\u003c')}</script>`

function montar(head, html) {
  return template
    .replace('<!--app-head-->', [preloads, head].filter(Boolean).join('\n    '))
    .replace('<!--app-html-->', html)
    .replace('<!--app-dados-->', scriptDados)
}

const arquivoDaRota = (rota) => (rota === '/' ? 'index.html' : `${rota.slice(1)}.html`)

async function gravar(arquivo, conteudo) {
  const destino = path.join(dist, arquivo)
  await fs.mkdir(path.dirname(destino), { recursive: true })
  await fs.writeFile(destino, conteudo)
}

// 3. Rotas públicas.
const rotas = [
  '/',
  '/sobre',
  '/servicos',
  ...SERVICOS.map((s) => `/servicos/${s.slug}`),
  '/portfolio',
  ...dados.obras.map((o) => `/portfolio/${o.slug}`),
  '/por-que-contratar',
  '/contato',
  '/politica-de-privacidade',
]

for (const rota of rotas) {
  const { html, head } = render(rota, dados)
  if (!head) throw new Error(`A rota ${rota} não definiu <Seo>.`)
  await gravar(arquivoDaRota(rota), montar(head, html))
}

// 4. Páginas sem pré-renderização (o React monta no navegador):
//    404.html também atende obras cadastradas depois do último deploy.
const cascaNoIndex = (title) =>
  renderHeadTags({ title, description: SITE.descricao, path: '/', noindex: true })
await gravar('404.html', montar(cascaNoIndex('Página não encontrada'), ''))
await gravar('admin.html', montar(cascaNoIndex('Painel'), ''))

// 5. Sitemap.
const hoje = new Date().toISOString().slice(0, 10)
const prioridade = (rota) => (rota === '/' ? '1.0' : rota.split('/').length > 2 ? '0.7' : '0.8')
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${rotas
  .map(
    (rota) =>
      `  <url><loc>${SITE.url}${rota === '/' ? '/' : rota}</loc><lastmod>${hoje}</lastmod><priority>${prioridade(rota)}</priority></url>`,
  )
  .join('\n')}
</urlset>
`
await fs.writeFile(path.join(dist, 'sitemap.xml'), sitemap)

await fs.rm(distSsr, { recursive: true, force: true })
console.log(`Pré-renderizadas ${rotas.length} páginas + 404.html + admin.html + sitemap.xml`)

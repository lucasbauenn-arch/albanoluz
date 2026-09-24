import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import App from './App'
import { ConteudoProvider, type DadosIniciais } from './lib/conteudo-dinamico'
import { HeadContext, renderHeadTags, type HeadData } from './lib/head'

export { SITE } from './config/site'
export { OBRAS_LOCAIS } from './data/obras'
export { SERVICOS } from './data/servicos'
export { supabaseConfigurado } from './lib/env'
export { renderHeadTags } from './lib/head'
export { buscarDepoimentos, buscarObras } from './lib/remoto'

/** Renderiza uma rota para HTML estático (usado por scripts/prerender.mjs). */
export function render(url: string, dados: DadosIniciais) {
  const ctx: { head?: HeadData } = {}
  const html = renderToString(
    <StrictMode>
      <HeadContext.Provider value={ctx}>
        <StaticRouter location={url}>
          <ConteudoProvider inicial={dados}>
            <App />
          </ConteudoProvider>
        </StaticRouter>
      </HeadContext.Provider>
    </StrictMode>,
  )
  return { html, head: ctx.head ? renderHeadTags(ctx.head) : '' }
}

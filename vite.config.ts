import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'

/**
 * No `vite preview`, imita a hospedagem estática (Cloudflare Pages / nginx):
 * /sobre → sobre.html e rotas desconhecidas → 404.html.
 */
function urlsLimpasNoPreview(): Plugin {
  return {
    name: 'urls-limpas-no-preview',
    configurePreviewServer(server) {
      const dist = path.resolve(server.config.root, server.config.build.outDir)
      server.middlewares.use((req, _res, next) => {
        const [rota, busca = ''] = (req.url ?? '/').split('?')
        if (rota === '/' || path.extname(rota)) return next()
        const limpa = rota.replace(/\/$/, '')
        const alvo = fs.existsSync(path.join(dist, `${limpa}.html`)) ? `${limpa}.html` : '/404.html'
        req.url = alvo + (busca ? `?${busca}` : '')
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), urlsLimpasNoPreview()],
})

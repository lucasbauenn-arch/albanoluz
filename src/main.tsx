import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App'
import './index.css'
import { ConteudoProvider, DADOS_LOCAIS } from './lib/conteudo-dinamico'

const app = (
  <StrictMode>
    <BrowserRouter>
      <ConteudoProvider inicial={window.__AL_DADOS__ ?? DADOS_LOCAIS}>
        <App />
      </ConteudoProvider>
    </BrowserRouter>
  </StrictMode>
)

const raiz = document.getElementById('root')!

// Páginas pré-renderizadas são hidratadas; 404.html e admin.html chegam vazios.
if (raiz.firstElementChild) hydrateRoot(raiz, app)
else createRoot(raiz).render(app)

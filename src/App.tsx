import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import { Layout } from './components/layout/Layout'
import Contato from './pages/Contato'
import Home from './pages/Home'
import NaoEncontrado from './pages/NaoEncontrado'
import Obra from './pages/Obra'
import PorQueContratar from './pages/PorQueContratar'
import Portfolio from './pages/Portfolio'
import Privacidade from './pages/Privacidade'
import Servico from './pages/Servico'
import Servicos from './pages/Servicos'
import Sobre from './pages/Sobre'

// O painel fica em um chunk separado: não pesa nas páginas públicas.
const AdminApp = lazy(() => import('./admin/AdminApp'))

function CarregandoPainel() {
  return (
    <div role="status" className="flex min-h-dvh items-center justify-center text-grafite">
      Carregando painel…
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="sobre" element={<Sobre />} />
        <Route path="servicos" element={<Servicos />} />
        <Route path="servicos/:slug" element={<Servico />} />
        <Route path="portfolio" element={<Portfolio />} />
        <Route path="portfolio/:slug" element={<Obra />} />
        <Route path="por-que-contratar" element={<PorQueContratar />} />
        <Route path="contato" element={<Contato />} />
        <Route path="politica-de-privacidade" element={<Privacidade />} />
        <Route path="*" element={<NaoEncontrado />} />
      </Route>
      <Route
        path="admin/*"
        element={
          <Suspense fallback={<CarregandoPainel />}>
            <AdminApp />
          </Suspense>
        }
      />
    </Routes>
  )
}

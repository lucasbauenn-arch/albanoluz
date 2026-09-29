import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { AvisoIlustrativas } from '../components/AvisoIlustrativas'
import { CtaOrcamento } from '../components/CtaOrcamento'
import { ObraCard } from '../components/ObraCard'
import { CabecalhoPagina } from '../components/ui/CabecalhoPagina'
import { ehIlustrativa } from '../data/fotos'
import { iluUrl } from '../data/ilustracoes'
import { useConteudo } from '../lib/conteudo-dinamico'
import { Seo, schemaBreadcrumb } from '../lib/head'
import type { CategoriaObra } from '../types'

type Filtro = 'todas' | CategoriaObra

const FILTROS: { id: Filtro; nome: string }[] = [
  { id: 'todas', nome: 'Todas' },
  { id: 'realizada', nome: 'Realizadas' },
  { id: 'andamento', nome: 'Em andamento' },
  { id: '3d', nome: '3D / Renders' },
  { id: 'prancha', nome: 'Pranchas técnicas' },
]

const trilha = [
  { nome: 'Início', path: '/' },
  { nome: 'Portfólio', path: '/portfolio' },
]

const ehFiltro = (v: string | null): v is Filtro => FILTROS.some((f) => f.id === v)

export default function Portfolio() {
  const { obras } = useConteudo()
  const navigate = useNavigate()
  const [filtro, setFiltro] = useState<Filtro>('todas')

  // O filtro vem da URL só depois da hidratação (a página é pré-renderizada com "Todas").
  useEffect(() => {
    const f = new URLSearchParams(window.location.search).get('filtro')
    if (ehFiltro(f)) setFiltro(f)
  }, [])

  function escolher(f: Filtro) {
    setFiltro(f)
    navigate(f === 'todas' ? '/portfolio' : `/portfolio?filtro=${f}`, { replace: true, preventScrollReset: true })
  }

  const visiveis = filtro === 'todas' ? obras : obras.filter((o) => o.categoria === filtro)
  const contagem = (f: Filtro) => (f === 'todas' ? obras.length : obras.filter((o) => o.categoria === f).length)

  return (
    <>
      <Seo
        title="Portfólio de obras e projetos"
        description="Obras realizadas e em andamento, modelagens 3D e pranchas técnicas de cálculo estrutural e projetos complementares da Albano Luz Engenharia."
        path="/portfolio"
        jsonLd={[schemaBreadcrumb(trilha)]}
      />
      <CabecalhoPagina
        trilha={trilha}
        titulo="Portfólio"
        descricao="Residências, edifícios multifamiliares, comércios e galpões: obras entregues, obras em execução, modelagens 3D e exemplos das nossas pranchas técnicas."
        imagem={iluUrl('isometrico-edificio6')}
      />

      <section aria-labelledby="galeria-obras" className="container-site py-14 sm:py-20">
        <h2 id="galeria-obras" className="sr-only">
          Obras
        </h2>
        <div role="group" aria-label="Filtrar obras" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
          {FILTROS.map((f) => {
            const ativo = filtro === f.id
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={ativo}
                onClick={() => escolher(f.id)}
                className={`shrink-0 border px-4 py-2.5 text-[0.95rem] font-medium whitespace-nowrap transition-colors ${
                  ativo ? 'border-marinho bg-marinho text-white' : 'border-marinho/25 bg-white text-marinho hover:border-marinho'
                }`}
              >
                {f.nome}
                <span className={`ml-2 text-sm ${ativo ? 'text-marinho-200' : 'text-grafite'}`}>{contagem(f.id)}</span>
              </button>
            )
          })}
        </div>

        <p aria-live="polite" className="mt-6 text-sm text-grafite">
          {visiveis.length === 1 ? '1 obra encontrada' : `${visiveis.length} obras encontradas`}
        </p>

        {/* Pelo conteúdo, não pela fonte: o seed publica no Supabase as mesmas obras ilustrativas. */}
        {visiveis.some(ehIlustrativa) && <AvisoIlustrativas className="mt-4" />}

        {visiveis.length > 0 ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visiveis.map((obra) => (
              <ObraCard key={obra.id} obra={obra} />
            ))}
          </div>
        ) : (
          <p className="mt-8 border border-dashed border-marinho/30 bg-white/60 p-10 text-center text-grafite">
            Nenhuma obra nesta categoria por enquanto.
          </p>
        )}
      </section>

      <CtaOrcamento titulo="Quer ver a sua obra neste portfólio?" />
    </>
  )
}

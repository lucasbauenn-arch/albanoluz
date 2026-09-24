import { ArrowLeft, ArrowRight, LoaderCircle } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { BotaoWhatsApp } from '../components/BotaoWhatsApp'
import { CtaOrcamento } from '../components/CtaOrcamento'
import { Galeria } from '../components/Galeria'
import { ObraCard, SeloObra, metaObra } from '../components/ObraCard'
import { CabecalhoPagina } from '../components/ui/CabecalhoPagina'
import { Moldura } from '../components/ui/Moldura'
import { botao } from '../components/ui/botao'
import { servicoPorSlug } from '../data/servicos'
import { useConteudo } from '../lib/conteudo-dinamico'
import { Seo, schemaBreadcrumb } from '../lib/head'
import { CATEGORIA_LABEL, TIPO_LABEL, type Obra as TObra } from '../types'
import NaoEncontrado from './NaoEncontrado'

/** WhatsApp e redes não exibem SVG como prévia; nesses casos fica a imagem padrão. */
const imagemOg = (obra: TObra) => (/\.(jpe?g|png)(\?|$)/i.test(obra.capa.url) ? obra.capa.url : undefined)

export default function Obra() {
  const { slug } = useParams()
  const { obras, atualizado } = useConteudo()
  const obra = obras.find((o) => o.slug === slug)

  if (!obra) {
    if (!atualizado) {
      return (
        <div role="status" className="container-site flex min-h-[50vh] items-center justify-center gap-3 text-grafite">
          <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
          Carregando obra…
        </div>
      )
    }
    return <NaoEncontrado />
  }

  const path = `/portfolio/${obra.slug}`
  const trilha = [
    { nome: 'Início', path: '/' },
    { nome: 'Portfólio', path: '/portfolio' },
    { nome: obra.titulo, path },
  ]
  const servicos = obra.servicos.map(servicoPorSlug).filter((s) => s !== undefined)
  const relacionadas = obras
    .filter((o) => o.id !== obra.id)
    .map((o) => ({
      o,
      pontos: (o.categoria === obra.categoria ? 2 : 0) + o.servicos.filter((s) => obra.servicos.includes(s)).length,
    }))
    .sort((a, b) => b.pontos - a.pontos)
    .slice(0, 3)
    .map((r) => r.o)

  const descricao =
    obra.descricao ??
    `${obra.titulo}: ${servicos.map((s) => s.nomeCurto.toLowerCase()).join(', ')}${obra.cidade ? ` em ${obra.cidade}` : ''}.`

  return (
    <>
      <Seo
        title={`${obra.titulo}${obra.cidade ? ` — ${obra.cidade}` : ''}`}
        description={descricao.slice(0, 160)}
        path={path}
        image={imagemOg(obra)}
        type="article"
        jsonLd={[schemaBreadcrumb(trilha)]}
      />
      <CabecalhoPagina trilha={trilha} titulo={obra.titulo} descricao={metaObra(obra)}>
        <div className="mt-6">
          <SeloObra obra={obra} />
        </div>
      </CabecalhoPagina>

      <section aria-label="Detalhes da obra" className="container-site grid gap-14 py-16 sm:py-20 lg:grid-cols-[1.4fr_1fr]">
        <Moldura foto={obra.capa} prioridade />
        <div>
          <dl className="divide-y divide-marinho/10 border-y border-marinho/10">
            <div className="grid grid-cols-[8rem_1fr] gap-4 py-4">
              <dt className="text-sm font-medium text-grafite">Tipo</dt>
              <dd className="text-marinho">{TIPO_LABEL[obra.tipo]}</dd>
            </div>
            <div className="grid grid-cols-[8rem_1fr] gap-4 py-4">
              <dt className="text-sm font-medium text-grafite">Situação</dt>
              <dd className="text-marinho">{CATEGORIA_LABEL[obra.categoria]}</dd>
            </div>
            {obra.cidade && (
              <div className="grid grid-cols-[8rem_1fr] gap-4 py-4">
                <dt className="text-sm font-medium text-grafite">Cidade</dt>
                <dd className="text-marinho">{obra.cidade}</dd>
              </div>
            )}
            {obra.ano && (
              <div className="grid grid-cols-[8rem_1fr] gap-4 py-4">
                <dt className="text-sm font-medium text-grafite">Ano</dt>
                <dd className="text-marinho">{obra.ano}</dd>
              </div>
            )}
            {servicos.length > 0 && (
              <div className="grid grid-cols-[8rem_1fr] gap-4 py-4">
                <dt className="text-sm font-medium text-grafite">Serviços</dt>
                <dd>
                  <ul className="flex flex-wrap gap-1.5">
                    {servicos.map((s) => (
                      <li key={s.slug}>
                        <Link
                          to={`/servicos/${s.slug}`}
                          className="inline-block border border-marinho/20 bg-white px-2.5 py-1 text-sm font-medium text-marinho hover:border-marinho"
                        >
                          {s.nomeCurto}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
          </dl>
          {obra.descricao && <p className="mt-8 text-lg text-grafite">{obra.descricao}</p>}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
            <Link to="/contato" className={botao('primario')}>
              Quero um projeto assim
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
            <BotaoWhatsApp origem="obra" variante="contorno" />
          </div>
        </div>
      </section>

      {obra.fotos.length > 1 && (
        <section aria-labelledby="galeria" className="border-t border-marinho/10 bg-white py-16 sm:py-20">
          <div className="container-site">
            <h2 id="galeria" className="text-4xl text-marinho">
              Galeria
            </h2>
            <p className="mt-2 text-grafite">Clique em uma imagem para ampliar.</p>
            <div className="mt-10">
              <Galeria fotos={obra.fotos} />
            </div>
          </div>
        </section>
      )}

      {relacionadas.length > 0 && (
        <section aria-labelledby="relacionadas" className="container-site py-16 sm:py-20">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <h2 id="relacionadas" className="text-4xl text-marinho">
              Outras obras
            </h2>
            <Link to="/portfolio" className="inline-flex items-center gap-2 font-semibold text-marinho hover:underline">
              <ArrowLeft aria-hidden="true" className="size-4" />
              Voltar ao portfólio
            </Link>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {relacionadas.map((o) => (
              <ObraCard key={o.id} obra={o} />
            ))}
          </div>
        </section>
      )}

      <CtaOrcamento />
    </>
  )
}

import { ArrowRight, Check } from 'lucide-react'
import { Link } from 'react-router'
import { CtaOrcamento } from '../components/CtaOrcamento'
import { CabecalhoPagina } from '../components/ui/CabecalhoPagina'
import { Moldura } from '../components/ui/Moldura'
import { TituloSecao } from '../components/ui/TituloSecao'
import { botao } from '../components/ui/botao'
import { SITE } from '../config/site'
import { iluUrl } from '../data/ilustracoes'
import { SERVICOS_PROJETO, SERVICO_EXECUCAO } from '../data/servicos'
import { Seo, schemaBreadcrumb, urlAbsoluta } from '../lib/head'

const trilha = [
  { nome: 'Início', path: '/' },
  { nome: 'Serviços', path: '/servicos' },
]

export default function Servicos() {
  const execucao = SERVICO_EXECUCAO
  return (
    <>
      <Seo
        title="Serviços de engenharia: projetos e execução de obras"
        description={`Projeto estrutural, fundação, elétrico, hidráulico, combate a incêndio, arquitetura, executivo e modelagem 3D, além da execução de obras em ${SITE.areaAtendida}.`}
        path="/servicos"
        jsonLd={[
          schemaBreadcrumb(trilha),
          {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            itemListElement: [...SERVICOS_PROJETO, execucao].map((s, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: s.nome,
              url: urlAbsoluta(`/servicos/${s.slug}`),
            })),
          },
        ]}
      />
      <CabecalhoPagina
        trilha={trilha}
        titulo="Projetos e execução, com a mesma equipe técnica"
        descricao="Oito disciplinas de projeto compatibilizadas entre si e uma equipe para executar a obra. Contrate um serviço isolado ou o pacote completo."
        imagem={iluUrl('hero-estrutura')}
      />

      <section aria-labelledby="projetos" className="container-site py-20 sm:py-24">
        <TituloSecao
          id="projetos"
          sobretitulo="Projetos"
          titulo="Oito disciplinas, um projeto compatibilizado"
          descricao="O cálculo estrutural é o centro do nosso trabalho. Os projetos complementares nascem junto com ele, sem interferências."
        />
        <ul className="mt-12 grid gap-6 md:grid-cols-2">
          {SERVICOS_PROJETO.map(({ slug, nome, resumo, icone: Icone, beneficios }) => (
            <li key={slug} className="group relative flex flex-col border border-marinho/10 bg-white p-7 transition-shadow hover:shadow-[10px_10px_0_0_var(--color-marinho)] sm:p-8">
              <div className="flex items-start gap-5">
                <span className="flex size-14 shrink-0 items-center justify-center bg-marinho text-white">
                  <Icone aria-hidden="true" className="size-7" strokeWidth={1.5} />
                </span>
                <div>
                  <h3 className="text-[1.75rem] text-marinho">
                    <Link to={`/servicos/${slug}`} className="after:absolute after:inset-0">
                      {nome}
                    </Link>
                  </h3>
                  <p className="mt-2 text-grafite">{resumo}</p>
                </div>
              </div>
              <ul className="mt-6 flex-1 space-y-2 border-t border-marinho/10 pt-5">
                {beneficios.slice(0, 3).map((b) => (
                  <li key={b} className="flex items-start gap-2 text-[0.95rem] text-tinta">
                    <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-marinho" />
                    {b}
                  </li>
                ))}
              </ul>
              <span aria-hidden="true" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-marinho">
                Ver detalhes
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="execucao" className="border-t border-marinho/10 bg-concreto-claro/70 py-20 sm:py-24">
        <div className="container-site grid items-center gap-14 lg:grid-cols-2">
          <div>
            <TituloSecao id="execucao" sobretitulo="Execuções" titulo={execucao.nome} descricao={execucao.resumo} />
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {execucao.destaques?.map((d) => (
                <li key={d.titulo} className="flex items-center gap-3 border border-marinho/10 bg-white px-4 py-3 font-medium text-marinho">
                  <Check aria-hidden="true" className="size-4 shrink-0" />
                  {d.titulo}
                </li>
              ))}
            </ul>
            <Link to={`/servicos/${execucao.slug}`} className={`${botao('primario')} mt-8`}>
              Conhecer a execução de obras
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
          <Moldura foto={execucao.foto ?? execucao.imagens[0]} />
        </div>
      </section>

      <CtaOrcamento />
    </>
  )
}

import { ArrowRight, Check, FileCheck2 } from 'lucide-react'
import { Link, useParams } from 'react-router'
import { AntesDepois } from '../components/AntesDepois'
import { BotaoWhatsApp } from '../components/BotaoWhatsApp'
import { CtaOrcamento } from '../components/CtaOrcamento'
import { Faq, schemaFaq } from '../components/Faq'
import { Galeria } from '../components/Galeria'
import { CabecalhoPagina } from '../components/ui/CabecalhoPagina'
import { Moldura } from '../components/ui/Moldura'
import { TituloSecao } from '../components/ui/TituloSecao'
import { botao } from '../components/ui/botao'
import { SITE } from '../config/site'
import { ilu, iluUrl } from '../data/ilustracoes'
import { SERVICOS, servicoPorSlug } from '../data/servicos'
import { Seo, schemaBreadcrumb, urlAbsoluta } from '../lib/head'
import NaoEncontrado from './NaoEncontrado'

export default function Servico() {
  const { slug } = useParams()
  const servico = servicoPorSlug(slug)
  if (!servico) return <NaoEncontrado />

  const path = `/servicos/${servico.slug}`
  const trilha = [
    { nome: 'Início', path: '/' },
    { nome: 'Serviços', path: '/servicos' },
    { nome: servico.nomeCurto, path },
  ]
  const e3d = servico.slug === 'modelagem-3d'
  const execucao = servico.grupo === 'execucao'
  const outros = SERVICOS.filter((s) => s.slug !== servico.slug)

  return (
    <>
      <Seo
        title={servico.seoTitulo}
        description={servico.seoDescricao}
        path={path}
        jsonLd={[
          schemaBreadcrumb(trilha),
          {
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: servico.nome,
            serviceType: servico.nome,
            description: servico.seoDescricao,
            url: urlAbsoluta(path),
            areaServed: SITE.areaAtendida,
            provider: { '@id': `${SITE.url}/#empresa` },
          },
          schemaFaq(servico.faq),
        ]}
      />
      <CabecalhoPagina trilha={trilha} titulo={servico.nome} descricao={servico.resumo} imagem={iluUrl('hero-estrutura')}>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link to={`/contato?servico=${servico.slug}`} className={botao('claro', 'lg')}>
            Solicitar orçamento
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
          <BotaoWhatsApp origem={`servico-${servico.slug}`} tamanho="lg" />
        </div>
      </CabecalhoPagina>

      <section aria-labelledby="sobre-servico" className="container-site grid items-center gap-14 py-20 sm:py-24 lg:grid-cols-2">
        <div>
          <TituloSecao
            id="sobre-servico"
            sobretitulo={execucao ? 'Execução' : 'O serviço'}
            titulo={e3d ? 'Da modelagem à imagem final' : execucao ? 'Quem projeta, acompanha a obra' : 'Como funciona'}
          />
          <div className="mt-6 space-y-4 text-lg text-grafite">
            {servico.descricao.map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>
        </div>
        {e3d ? (
          <AntesDepois antes={ilu('wireframe-residencia')} depois={ilu('render-residencia')} />
        ) : (
          <Moldura foto={servico.foto ?? servico.imagens[0]} className="lg:ml-6" />
        )}
      </section>

      {servico.destaques && (
        <section aria-labelledby="destaques" className="border-y border-marinho/10 bg-white py-20 sm:py-24">
          <div className="container-site">
            <TituloSecao
              id="destaques"
              sobretitulo={execucao ? 'Frentes de trabalho' : 'Sistemas estruturais'}
              titulo={execucao ? 'O que executamos' : 'A solução certa para cada obra'}
            />
            <ul className={`mt-12 grid gap-6 ${servico.destaques.length > 2 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2'}`}>
              {servico.destaques.map((d, i) => (
                <li key={d.titulo} className="border-t-2 border-marinho bg-concreto-claro/60 p-7">
                  <span className="font-serif text-lg font-semibold text-marinho-400">{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="mt-2 text-2xl text-marinho">{d.titulo}</h3>
                  <p className="mt-2 text-grafite">{d.texto}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section aria-labelledby="beneficios" className="grade-tecnica tema-escuro py-20 sm:py-24">
        <div className="container-site grid gap-14 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <TituloSecao escuro id="beneficios" sobretitulo="Benefícios" titulo="O que você ganha" />
            <ul className="mt-10 grid gap-4 sm:grid-cols-2">
              {servico.beneficios.map((b) => (
                <li key={b} className="flex items-start gap-3 border border-white/15 bg-white/5 p-5 text-marinho-50">
                  <Check aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-white" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-3xl text-white">O que entregamos</h2>
            <ul className="mt-8 divide-y divide-white/15 border-y border-white/15">
              {servico.entregaveis.map((e) => (
                <li key={e} className="flex items-center gap-3 py-4 text-marinho-50">
                  <FileCheck2 aria-hidden="true" className="size-5 shrink-0 text-marinho-200" />
                  {e}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section aria-labelledby="exemplos" className="container-site py-20 sm:py-24">
        <TituloSecao
          id="exemplos"
          sobretitulo="Exemplos"
          titulo={e3d ? 'Renders de fachada e interiores' : execucao ? 'Obras em execução' : 'Pranchas e desenhos'}
          descricao="Clique em uma imagem para ampliar."
        />
        <div className="mt-12">
          <Galeria fotos={servico.imagens} />
        </div>
      </section>

      <section aria-labelledby="faq" className="border-t border-marinho/10 bg-white py-20 sm:py-24">
        <div className="container-site grid gap-12 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <TituloSecao id="faq" sobretitulo="Perguntas frequentes" titulo="Dúvidas sobre este serviço" />
            <p className="mt-4 text-grafite">
              Não encontrou a resposta?{' '}
              <Link to={`/contato?servico=${servico.slug}`} className="font-medium text-marinho underline underline-offset-2">
                Fale com a gente
              </Link>
              .
            </p>
          </div>
          <Faq itens={servico.faq} />
        </div>
      </section>

      <nav aria-labelledby="outros-servicos" className="border-t border-marinho/10 py-14">
        <div className="container-site">
          <h2 id="outros-servicos" className="text-3xl text-marinho">
            Outros serviços
          </h2>
          <ul className="mt-6 flex flex-wrap gap-3">
            {outros.map((s) => (
              <li key={s.slug}>
                <Link
                  to={`/servicos/${s.slug}`}
                  className="inline-flex items-center gap-2 border border-marinho/20 bg-white px-4 py-2.5 text-[0.95rem] font-medium text-marinho transition-colors hover:border-marinho hover:bg-marinho hover:text-white"
                >
                  <s.icone aria-hidden="true" className="size-4" />
                  {s.nomeCurto}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <CtaOrcamento servico={servico.slug} />
    </>
  )
}

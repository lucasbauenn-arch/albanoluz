import { Check, UserRound } from 'lucide-react'
import { CtaOrcamento } from '../components/CtaOrcamento'
import { CabecalhoPagina } from '../components/ui/CabecalhoPagina'
import { Moldura } from '../components/ui/Moldura'
import { TituloSecao } from '../components/ui/TituloSecao'
import { SITE } from '../config/site'
import { MISSAO_VISAO_VALORES, NUMEROS, QUEM_SOMOS } from '../data/conteudo'
import { foto } from '../data/fotos'
import { iluUrl } from '../data/ilustracoes'
import { Seo, schemaBreadcrumb } from '../lib/head'

const trilha = [
  { nome: 'Início', path: '/' },
  { nome: 'Sobre', path: '/sobre' },
]

export default function Sobre() {
  const { responsavel } = SITE
  return (
    <>
      <Seo
        title="Sobre a Albano Luz Engenharia"
        description={`Há mais de ${SITE.anosMercado} anos unindo segurança e economia na construção civil, com mais de ${SITE.projetosEntregues} projetos entregues para arquitetos e construtoras.`}
        path="/sobre"
        jsonLd={[schemaBreadcrumb(trilha)]}
      />
      <CabecalhoPagina
        trilha={trilha}
        titulo="Engenharia que une segurança e economia"
        descricao={`Mais de ${SITE.anosMercado} anos e ${SITE.projetosEntregues} projetos entregues ao lado de arquitetos, construtoras e donos de obra.`}
        imagem={iluUrl('isometrico-multifamiliar')}
      />

      <section aria-labelledby="quem-somos" className="container-site grid items-center gap-14 py-20 sm:py-24 lg:grid-cols-2">
        <div>
          <TituloSecao id="quem-somos" sobretitulo="Quem somos" titulo="Um parceiro técnico do estudo inicial à entrega" />
          <div className="mt-6 space-y-4 text-lg text-grafite">
            {QUEM_SOMOS.map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>
        </div>
        <Moldura foto={foto('laje-equipe-obra')} className="lg:ml-6" />
      </section>

      <section aria-label="Números" className="border-y border-marinho/10 bg-white">
        <div className="container-site">
          <dl className="grid grid-cols-2 gap-px bg-marinho/10 lg:grid-cols-4">
            {NUMEROS.map((n) => (
              <div key={n.rotulo} className="flex flex-col-reverse gap-1 bg-white px-4 py-8 sm:px-8">
                <dt className="text-[0.95rem] text-grafite">{n.rotulo}</dt>
                <dd className="font-serif text-5xl font-semibold text-marinho">{n.valor}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section aria-labelledby="mvv" className="container-site py-20 sm:py-24">
        <TituloSecao id="mvv" sobretitulo="Missão, visão e valores" titulo="O que nos move" centralizado />
        <ul className="mt-12 grid gap-6 lg:grid-cols-3">
          {MISSAO_VISAO_VALORES.map(({ icone: Icone, titulo, texto, lista }) => (
            <li key={titulo} className="flex flex-col border border-marinho/10 bg-white p-8">
              <span className="flex size-14 items-center justify-center bg-marinho text-white">
                <Icone aria-hidden="true" className="size-7" strokeWidth={1.5} />
              </span>
              <h3 className="mt-6 text-3xl text-marinho">{titulo}</h3>
              <p className="mt-3 text-grafite">{texto}</p>
              {lista && (
                <ul className="mt-4 space-y-2">
                  {lista.map((v) => (
                    <li key={v} className="flex items-start gap-2 text-grafite">
                      <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-marinho" />
                      {v}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* PENDENTE: foto, nome, mini-bio e CREA do responsável técnico (src/config/site.ts) */}
      <section aria-labelledby="responsavel" className="border-t border-marinho/10 bg-concreto-claro/70 py-20 sm:py-24">
        <div className="container-site grid items-center gap-12 lg:grid-cols-[minmax(0,380px)_1fr] lg:gap-16">
          <div className="mx-auto w-full max-w-sm border border-marinho/25 bg-white p-2 sombra-deslocada">
            {responsavel.foto ? (
              <img
                src={responsavel.foto}
                alt={`Foto de ${responsavel.nome ?? 'responsável técnico'}`}
                width={760}
                height={950}
                loading="lazy"
                className="aspect-[4/5] w-full object-cover"
              />
            ) : (
              <div className="grade-tecnica flex aspect-[4/5] w-full flex-col items-center justify-center gap-3 text-marinho-200">
                <UserRound aria-hidden="true" className="size-20" strokeWidth={1} />
                <span className="text-sm">Foto em breve</span>
              </div>
            )}
          </div>
          <div>
            <TituloSecao
              id="responsavel"
              sobretitulo="Responsável técnico"
              titulo={responsavel.nome ?? 'Engenharia com nome e registro'}
            />
            <p className="mt-2 text-lg font-medium text-marinho-600">
              {responsavel.titulo}
              {responsavel.crea && <> · CREA {responsavel.crea}</>}
            </p>
            <p className="mt-5 max-w-2xl text-lg text-grafite">
              {responsavel.bio ??
                'Todos os projetos são desenvolvidos e assinados por engenheiro civil habilitado, com ART registrada no CREA. O mesmo profissional que calcula a estrutura acompanha a execução em campo.'}
            </p>
          </div>
        </div>
      </section>

      <CtaOrcamento />
    </>
  )
}

import { Quote } from 'lucide-react'
import { CtaOrcamento } from '../components/CtaOrcamento'
import { LinhaDoTempo } from '../components/LinhaDoTempo'
import { CabecalhoPagina } from '../components/ui/CabecalhoPagina'
import { TituloSecao } from '../components/ui/TituloSecao'
import { MOTIVOS } from '../data/conteudo'
import { iluUrl } from '../data/ilustracoes'
import { useConteudo } from '../lib/conteudo-dinamico'
import { Seo, schemaBreadcrumb } from '../lib/head'

const trilha = [
  { nome: 'Início', path: '/' },
  { nome: 'Por que contratar', path: '/por-que-contratar' },
]

export default function PorQueContratar() {
  const { depoimentos } = useConteudo()
  return (
    <>
      <Seo
        title="Por que contratar a Albano Luz Engenharia"
        description="Expertise técnica, conformidade normativa, soluções personalizadas e acompanhamento em campo: 9 motivos para confiar o seu projeto à Albano Luz."
        path="/por-que-contratar"
        jsonLd={[schemaBreadcrumb(trilha)]}
      />
      <CabecalhoPagina
        trilha={trilha}
        titulo="Nove motivos para confiar o seu projeto a nós"
        descricao="Engenharia feita com rigor técnico, transparência e presença na obra, do primeiro traço à entrega."
        imagem={iluUrl('isometrico-ampliacao')}
      />

      <section aria-labelledby="motivos" className="container-site py-20 sm:py-24">
        <h2 id="motivos" className="sr-only">
          Motivos para contratar
        </h2>
        <ol className="grid gap-px border border-marinho/10 bg-marinho/10 sm:grid-cols-2 lg:grid-cols-3">
          {MOTIVOS.map(({ icone: Icone, titulo, texto }, i) => (
            <li key={titulo} className="flex flex-col bg-white p-7 sm:p-8">
              <div className="flex items-center justify-between">
                <Icone aria-hidden="true" className="size-8 text-marinho" strokeWidth={1.5} />
                <span aria-hidden="true" className="font-serif text-4xl font-semibold text-marinho-100">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
              <h3 className="mt-6 text-2xl text-marinho">{titulo}</h3>
              <p className="mt-2 text-grafite">{texto}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="metodo" className="grade-tecnica tema-escuro py-20 sm:py-24">
        <div className="container-site">
          <TituloSecao escuro id="metodo" sobretitulo="Nosso método" titulo="Cinco etapas, nenhuma surpresa" />
          <div className="mt-14">
            <LinhaDoTempo escuro />
          </div>
        </div>
      </section>

      {/* Depoimentos reais cadastrados no painel admin (PRD: coletar com autorização). */}
      {depoimentos.length > 0 && (
        <section aria-labelledby="depoimentos" className="container-site py-20 sm:py-24">
          <TituloSecao id="depoimentos" sobretitulo="Depoimentos" titulo="O que dizem nossos clientes" />
          <ul className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {depoimentos.map((d) => (
              <li key={d.id}>
                <figure className="flex h-full flex-col border border-marinho/10 bg-white p-8">
                  <Quote aria-hidden="true" className="size-8 text-marinho-200" />
                  <blockquote className="mt-4 flex-1 font-serif text-xl leading-snug text-marinho">“{d.texto}”</blockquote>
                  <figcaption className="mt-6 flex items-center gap-3 border-t border-marinho/10 pt-5">
                    {d.fotoUrl && (
                      <img src={d.fotoUrl} alt="" width={48} height={48} loading="lazy" className="size-12 rounded-full object-cover" />
                    )}
                    <span>
                      <span className="block font-semibold text-tinta">{d.nome}</span>
                      <span className="block text-sm text-grafite">{[d.cargo, d.empresa].filter(Boolean).join(' · ')}</span>
                    </span>
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </section>
      )}

      <CtaOrcamento />
    </>
  )
}

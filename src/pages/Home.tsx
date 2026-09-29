import { ArrowRight, Check, Mail } from 'lucide-react'
import { Link } from 'react-router'
import { AvisoIlustrativas } from '../components/AvisoIlustrativas'
import { BotaoWhatsApp } from '../components/BotaoWhatsApp'
import { LinhaDoTempo } from '../components/LinhaDoTempo'
import { ObraCard } from '../components/ObraCard'
import { FormularioOrcamento } from '../components/forms/FormularioOrcamento'
import { IconeInstagram } from '../components/ui/IconesMarca'
import { TituloSecao } from '../components/ui/TituloSecao'
import { botao } from '../components/ui/botao'
import { SITE, emailUrl, instagramUrl } from '../config/site'
import { DIFERENCIAIS, NUMEROS } from '../data/conteudo'
import { ehIlustrativa } from '../data/fotos'
import { ILUSTRACOES, iluUrl } from '../data/ilustracoes'
import { SERVICOS_PROJETO, SERVICO_EXECUCAO } from '../data/servicos'
import { useConteudo } from '../lib/conteudo-dinamico'
import { Seo } from '../lib/head'

export default function Home() {
  const { obras } = useConteudo()
  const destaques = [...obras.filter((o) => o.destaque), ...obras.filter((o) => !o.destaque)].slice(0, 6)
  const destaquesIlustrativos = destaques.some(ehIlustrativa)

  return (
    <>
      <Seo
        title={`Albano Luz Engenharia | Cálculo estrutural em ${SITE.cidade}`}
        description={SITE.descricao}
        path="/"
      />

      {/* Hero */}
      <section className="grade-tecnica tema-escuro relative overflow-hidden">
        <div className="container-site grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-24">
          <div>
            <p className="flex items-center gap-3 text-sm font-semibold tracking-[0.14em] text-marinho-200">
              <span aria-hidden="true" className="h-px w-8 bg-current" />
              Engenharia estrutural · {SITE.areaAtendida}
            </p>
            <h1 className="mt-5 text-[2.7rem] leading-[1.02] text-white sm:text-6xl xl:text-7xl">
              Cálculo estrutural seguro e econômico para arquitetos e construtoras
            </h1>
            <p className="mt-6 max-w-xl text-lg text-marinho-100">
              Projetos estruturais e complementares que respeitam a arquitetura e usam só o aço e o concreto
              necessários. Do cálculo ao acompanhamento da obra.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <BotaoWhatsApp origem="hero" tamanho="lg" />
              <Link to="/contato" className={botao('claro', 'lg')}>
                Solicitar orçamento
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
            <ul className="mt-10 grid gap-3 text-[0.95rem] text-marinho-100 sm:grid-cols-3 sm:gap-4">
              {['Normas da ABNT', 'Compatibilização com a arquitetura', 'Acompanhamento em campo'].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-white" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
            <div className="border border-white/20 p-2 sombra-deslocada-clara">
              <img
                src={iluUrl('hero-estrutura')}
                alt={ILUSTRACOES['hero-estrutura']}
                width={1200}
                height={1000}
                fetchPriority="high"
                className="block h-auto w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Números */}
      <section aria-label="A Albano Luz em números" className="border-b border-marinho/10 bg-white">
        <div className="container-site">
          <dl className="grid grid-cols-2 gap-px bg-marinho/10 lg:grid-cols-4">
            {NUMEROS.map((n) => (
              <div key={n.rotulo} className="flex flex-col-reverse gap-1 bg-white px-4 py-8 sm:px-8 sm:py-10">
                <dt className="text-[0.95rem] text-grafite">{n.rotulo}</dt>
                <dd className="font-serif text-5xl font-semibold text-marinho sm:text-6xl">{n.valor}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Diferenciais */}
      <section aria-labelledby="diferenciais" className="container-site py-20 sm:py-24">
        <TituloSecao
          id="diferenciais"
          sobretitulo="Diferenciais"
          titulo="Segurança e economia na mesma estrutura"
          descricao="Quatro compromissos que guiam cada projeto que sai do nosso escritório."
        />
        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {DIFERENCIAIS.map(({ icone: Icone, titulo, texto }) => (
            <li key={titulo} className="border-t-2 border-marinho bg-white p-6 sm:p-7">
              <Icone aria-hidden="true" className="size-8 text-marinho" strokeWidth={1.5} />
              <h3 className="mt-5 text-2xl text-marinho">{titulo}</h3>
              <p className="mt-2 text-[0.95rem] text-grafite">{texto}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Serviços */}
      <section aria-labelledby="servicos" className="border-y border-marinho/10 bg-concreto-claro/70 py-20 sm:py-24">
        <div className="container-site">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <TituloSecao
              id="servicos"
              sobretitulo="Serviços"
              titulo="Do cálculo estrutural à execução da obra"
              descricao="Oito disciplinas de projeto compatibilizadas entre si, e uma equipe para executar o que projetou."
            />
            <Link to="/servicos" className={`${botao('contorno')} shrink-0 self-start lg:self-auto`}>
              Todos os serviços
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
          <ul className="mt-12 grid gap-px border border-marinho/10 bg-marinho/10 sm:grid-cols-2 lg:grid-cols-3">
            {[...SERVICOS_PROJETO, SERVICO_EXECUCAO].map(({ slug, nome, resumo, icone: Icone, grupo }) => (
              <li key={slug} className={`group relative flex flex-col p-7 ${grupo === 'execucao' ? 'bg-marinho tema-escuro' : 'bg-white'}`}>
                <Icone aria-hidden="true" className={`size-8 ${grupo === 'execucao' ? 'text-white' : 'text-marinho'}`} strokeWidth={1.5} />
                <h3 className={`mt-5 text-2xl ${grupo === 'execucao' ? 'text-white' : 'text-marinho'}`}>
                  <Link to={`/servicos/${slug}`} className="after:absolute after:inset-0">
                    {nome}
                  </Link>
                </h3>
                <p className={`mt-2 flex-1 text-[0.95rem] ${grupo === 'execucao' ? 'text-marinho-100' : 'text-grafite'}`}>{resumo}</p>
                <span
                  aria-hidden="true"
                  className={`mt-5 inline-flex items-center gap-1.5 text-sm font-semibold ${grupo === 'execucao' ? 'text-white' : 'text-marinho'}`}
                >
                  Saiba mais
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Obras em destaque */}
      <section aria-labelledby="obras" className="container-site py-20 sm:py-24">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <TituloSecao
            id="obras"
            sobretitulo="Portfólio"
            titulo="Obras que já saíram do papel"
            descricao="Residências, edifícios, comércios e galpões calculados e acompanhados pela nossa equipe."
          />
          <Link to="/portfolio" className={`${botao('contorno')} shrink-0 self-start lg:self-auto`}>
            Ver portfólio completo
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
        {destaquesIlustrativos && <AvisoIlustrativas className="mt-10" />}
        <div className={`${destaquesIlustrativos ? 'mt-8' : 'mt-12'} grid gap-6 sm:grid-cols-2 lg:grid-cols-3`}>
          {destaques.map((obra) => (
            <ObraCard key={obra.id} obra={obra} />
          ))}
        </div>
      </section>

      {/* Etapas */}
      <section aria-labelledby="etapas" className="border-y border-marinho/10 bg-white py-20 sm:py-24">
        <div className="container-site">
          <TituloSecao
            id="etapas"
            sobretitulo="Como trabalhamos"
            titulo="Um método do estudo inicial ao canteiro"
            descricao="Cada etapa tem um objetivo claro, para que a estrutura calculada seja a estrutura construída."
          />
          <div className="mt-14">
            <LinhaDoTempo />
          </div>
        </div>
      </section>

      {/* CTA final + formulário curto */}
      <section aria-labelledby="orcamento" className="grade-tecnica tema-escuro">
        <div className="container-site grid gap-12 py-20 sm:py-24 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <div>
            <TituloSecao
              escuro
              id="orcamento"
              sobretitulo="Orçamento sem compromisso"
              titulo="Conte sobre a sua obra e receba uma proposta"
              descricao="Deixe seus dados e retornamos para entender o projeto. Se preferir, envie a arquitetura completa pela página de contato."
            />
            <ul className="mt-10 space-y-4 text-marinho-100">
              <li>
                <BotaoWhatsApp origem="home-orcamento" variante="contorno-claro">
                  {SITE.whatsappExibicao}
                </BotaoWhatsApp>
              </li>
              <li>
                <a href={emailUrl} className="inline-flex items-center gap-3 hover:text-white">
                  <Mail aria-hidden="true" className="size-5" />
                  {SITE.email}
                </a>
              </li>
              <li>
                <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 hover:text-white">
                  <IconeInstagram />@{SITE.instagram}
                </a>
              </li>
            </ul>
          </div>
          <div className="bg-white p-6 text-tinta [--foco:var(--color-marinho)] sm:p-9">
            <FormularioOrcamento variante="curto" />
          </div>
        </div>
      </section>
    </>
  )
}

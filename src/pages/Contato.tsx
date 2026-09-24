import { Check, Mail, MapPin } from 'lucide-react'
import { BotaoWhatsApp } from '../components/BotaoWhatsApp'
import { FormularioOrcamento } from '../components/forms/FormularioOrcamento'
import { CabecalhoPagina } from '../components/ui/CabecalhoPagina'
import { IconeInstagram } from '../components/ui/IconesMarca'
import { SITE, emailUrl, instagramUrl } from '../config/site'
import { Seo, schemaBreadcrumb, urlAbsoluta } from '../lib/head'

const trilha = [
  { nome: 'Início', path: '/' },
  { nome: 'Contato', path: '/contato' },
]

const CHECKLIST = [
  'Projeto arquitetônico em PDF ou DWG',
  'Cidade e endereço aproximado da obra',
  'Laudo de sondagem do terreno, se já tiver',
  'Prazo desejado para o início da obra',
]

export default function Contato() {
  return (
    <>
      <Seo
        title="Contato e orçamento"
        description={`Solicite um orçamento de cálculo estrutural e projetos complementares. WhatsApp ${SITE.whatsappExibicao} ou formulário com envio do projeto.`}
        path="/contato"
        jsonLd={[
          schemaBreadcrumb(trilha),
          {
            '@context': 'https://schema.org',
            '@type': 'ContactPage',
            url: urlAbsoluta('/contato'),
            about: { '@id': `${SITE.url}/#empresa` },
          },
        ]}
      />
      <CabecalhoPagina
        trilha={trilha}
        titulo="Solicite um orçamento"
        descricao="Conte sobre a obra e, se puder, anexe a arquitetura. Com o projeto em mãos conseguimos avaliar o escopo e enviar uma proposta mais precisa."
      />

      <section className="container-site grid gap-10 py-14 sm:py-20 lg:grid-cols-[1.6fr_1fr] lg:gap-14">
        <div id="formulario" className="scroll-mt-28 border border-marinho/10 bg-white p-6 sm:p-10">
          <h2 className="text-3xl text-marinho sm:text-4xl">Formulário de orçamento</h2>
          <div className="mt-6">
            <FormularioOrcamento />
          </div>
        </div>

        <aside aria-label="Outros canais de contato" className="space-y-6">
          <div className="grade-tecnica tema-escuro p-7 sm:p-8">
            <h2 className="text-3xl text-white">Prefere conversar?</h2>
            <p className="mt-3 text-marinho-100">Fale direto com um engenheiro pelo WhatsApp.</p>
            <BotaoWhatsApp origem="contato" tamanho="lg" className="mt-6 w-full">
              {SITE.whatsappExibicao}
            </BotaoWhatsApp>
          </div>

          <ul className="divide-y divide-marinho/10 border border-marinho/10 bg-white">
            <li>
              <a href={emailUrl} className="flex items-center gap-4 p-5 hover:bg-marinho-50">
                <Mail aria-hidden="true" className="size-5 shrink-0 text-marinho" />
                <span className="min-w-0">
                  <span className="block text-sm text-grafite">E-mail</span>
                  <span className="block font-medium break-all text-marinho">{SITE.email}</span>
                </span>
              </a>
            </li>
            <li>
              <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-5 hover:bg-marinho-50">
                <IconeInstagram className="size-5 shrink-0 text-marinho" />
                <span>
                  <span className="block text-sm text-grafite">Instagram</span>
                  <span className="block font-medium text-marinho">@{SITE.instagram}</span>
                </span>
              </a>
            </li>
            <li className="flex items-center gap-4 p-5">
              <MapPin aria-hidden="true" className="size-5 shrink-0 text-marinho" />
              <span>
                <span className="block text-sm text-grafite">Atendimento</span>
                <span className="block font-medium text-marinho">{SITE.areaAtendida}</span>
              </span>
            </li>
          </ul>

          <div className="border border-marinho/10 bg-white p-7">
            <h2 className="text-2xl text-marinho">Para agilizar o orçamento</h2>
            <ul className="mt-4 space-y-2.5">
              {CHECKLIST.map((item) => (
                <li key={item} className="flex items-start gap-2 text-[0.95rem] text-grafite">
                  <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-marinho" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </section>
    </>
  )
}

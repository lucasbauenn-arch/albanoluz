import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { BotaoWhatsApp } from '../components/BotaoWhatsApp'
import { botao } from '../components/ui/botao'
import { Seo } from '../lib/head'

export default function NaoEncontrado() {
  return (
    <>
      <Seo title="Página não encontrada" description="A página que você procurou não existe ou mudou de endereço." path="/404" noindex />
      <section className="grade-tecnica tema-escuro">
        <div className="container-site flex min-h-[60vh] flex-col items-start justify-center py-20">
          <p className="font-serif text-8xl font-semibold text-marinho-300">404</p>
          <h1 className="mt-4 text-4xl text-white sm:text-5xl">Esta página não foi encontrada</h1>
          <p className="mt-4 max-w-xl text-lg text-marinho-100">
            O endereço pode ter mudado. Volte para o início ou fale com a gente pelo WhatsApp.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/" className={botao('claro', 'lg')}>
              Ir para o início
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
            <BotaoWhatsApp origem="404" tamanho="lg" />
          </div>
        </div>
      </section>
    </>
  )
}

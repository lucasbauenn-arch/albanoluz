import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'
import { BotaoWhatsApp } from './BotaoWhatsApp'
import { botao } from './ui/botao'

interface Props {
  titulo?: string
  texto?: string
  /** Serviço pré-selecionado no formulário de contato. */
  servico?: string
}

/** Chamada para orçamento que encerra cada página (PRD). */
export function CtaOrcamento({
  titulo = 'Tem um projeto em mãos? Vamos calcular com segurança e economia.',
  texto = 'Envie a arquitetura pelo formulário ou fale direto com um engenheiro pelo WhatsApp.',
  servico,
}: Props) {
  return (
    <section aria-labelledby="cta-orcamento" className="grade-tecnica tema-escuro">
      <div className="container-site grid items-center gap-10 py-16 sm:py-20 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <p className="flex items-center gap-3 text-sm font-semibold tracking-[0.14em] text-marinho-200">
            <span aria-hidden="true" className="h-px w-8 bg-current" />
            Orçamento sem compromisso
          </p>
          <h2 id="cta-orcamento" className="mt-3 text-4xl text-white sm:text-5xl">
            {titulo}
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-marinho-100">{texto}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <Link to={servico ? `/contato?servico=${servico}` : '/contato'} className={botao('claro', 'lg')}>
            Solicitar orçamento
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
          <BotaoWhatsApp origem="cta-orcamento" tamanho="lg" />
        </div>
      </div>
    </section>
  )
}

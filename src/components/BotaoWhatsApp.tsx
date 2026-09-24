import type { MouseEvent, ReactNode } from 'react'
import { track } from '../lib/analytics'
import { MENSAGEM_PADRAO, mensagemDaPagina, whatsappUrl } from '../lib/whatsapp'
import { IconeWhatsApp } from './ui/IconesMarca'
import { botao, type VarianteBotao } from './ui/botao'

interface Props {
  origem: string
  children?: ReactNode
  variante?: VarianteBotao
  tamanho?: 'sm' | 'md' | 'lg'
  className?: string
}

/** Link para o WhatsApp com mensagem que indica a página de origem. */
export function BotaoWhatsApp({ origem, children = 'Chamar no WhatsApp', variante = 'whats', tamanho = 'md', className = '' }: Props) {
  function aoClicar(e: MouseEvent<HTMLAnchorElement>) {
    e.currentTarget.href = whatsappUrl(mensagemDaPagina())
    track('clique_whatsapp', { origem, pagina: window.location.pathname })
  }
  return (
    <a
      href={whatsappUrl(MENSAGEM_PADRAO)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={aoClicar}
      className={`${botao(variante, tamanho)} ${className}`}
    >
      <IconeWhatsApp />
      {children}
      <span className="sr-only"> (abre em nova aba)</span>
    </a>
  )
}

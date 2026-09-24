import type { MouseEvent } from 'react'
import { track } from '../../lib/analytics'
import { MENSAGEM_PADRAO, mensagemDaPagina, whatsappUrl } from '../../lib/whatsapp'
import { IconeWhatsApp } from '../ui/IconesMarca'

export function WhatsAppFlutuante() {
  function aoClicar(e: MouseEvent<HTMLAnchorElement>) {
    e.currentTarget.href = whatsappUrl(mensagemDaPagina())
    track('clique_whatsapp', { origem: 'botao-flutuante', pagina: window.location.pathname })
  }
  return (
    <a
      href={whatsappUrl(MENSAGEM_PADRAO)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={aoClicar}
      aria-label="Conversar no WhatsApp (abre em nova aba)"
      className="group fixed right-4 z-40 flex size-14 items-center justify-center rounded-full bg-whats text-white shadow-[0_10px_30px_-8px_rgb(6_17_42/0.55)] transition-[bottom,background-color] duration-300 hover:bg-whats-escuro sm:right-6"
      style={{ bottom: 'calc(1rem + var(--altura-aviso-cookies, 0px))' }}
    >
      <IconeWhatsApp className="size-7" />
      <span className="pointer-events-none absolute right-full mr-3 hidden rounded-[2px] bg-marinho px-3 py-1.5 text-sm font-medium whitespace-nowrap opacity-0 transition-opacity group-hover:opacity-100 md:block">
        Fale com um engenheiro
      </span>
    </a>
  )
}

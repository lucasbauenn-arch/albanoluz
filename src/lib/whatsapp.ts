import { SITE } from '../config/site'

export function whatsappUrl(mensagem: string) {
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(mensagem)}`
}

export const MENSAGEM_PADRAO = 'Olá! Vim pelo site da Albano Luz Engenharia e gostaria de solicitar um orçamento.'

/** Mensagem pré-preenchida indicando a página de origem (PRD). */
export function mensagemDaPagina() {
  if (typeof document === 'undefined') return MENSAGEM_PADRAO
  const pagina = document.title.split(' | ')[0]?.trim()
  if (!pagina || window.location.pathname === '/') return MENSAGEM_PADRAO
  return `Olá! Estou no site da Albano Luz Engenharia, na página "${pagina}", e gostaria de solicitar um orçamento.`
}

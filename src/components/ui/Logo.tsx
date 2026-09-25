import { SITE } from '../../config/site'

// Logo oficial vetorizado a partir de marca/logo-original.webp (ver marca/vetorizar-logo.cjs).
// PENDENTE (PRD): substituir pelo arquivo vetorial original da marca quando o cliente enviar.

/** Logo completo (monograma + ALBANO LUZ ENGENHARIA). A altura vem do `className`. */
export function Logo({ claro = false, className = 'h-12 w-auto' }: { claro?: boolean; className?: string }) {
  return (
    <img
      src={claro ? '/marca/logo-branco.svg' : '/marca/logo.svg'}
      alt={SITE.nome}
      width={1865}
      height={633}
      className={`block ${className}`}
    />
  )
}

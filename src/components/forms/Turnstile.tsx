import { useEffect, useRef } from 'react'
import { TURNSTILE_SITE_KEY } from '../../lib/env'

interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string
  remove: (id: string) => void
  reset: (id: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

let carregamento: Promise<void> | null = null

function carregarScript() {
  carregamento ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Falha ao carregar o Turnstile'))
    document.head.appendChild(s)
  })
  return carregamento
}

export const turnstileAtivo = Boolean(TURNSTILE_SITE_KEY)

interface Props {
  aoToken: (token: string) => void
  /** Mude o valor para gerar um novo desafio (ex.: após erro no envio). */
  versao?: number
}

/** Cloudflare Turnstile (anti-spam). Só carrega quando o formulário se aproxima da tela. */
export function Turnstile({ aoToken, versao = 0 }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const aoTokenRef = useRef(aoToken)
  useEffect(() => {
    aoTokenRef.current = aoToken
  })

  useEffect(() => {
    const el = ref.current
    if (!turnstileAtivo || !el) return
    let widgetId: string | null = null
    let cancelado = false

    const iniciar = () => {
      carregarScript()
        .then(() => {
          if (cancelado || !window.turnstile) return
          widgetId = window.turnstile.render(el, {
            sitekey: TURNSTILE_SITE_KEY,
            language: 'pt-br',
            theme: 'light',
            callback: (t: string) => aoTokenRef.current(t),
            'expired-callback': () => aoTokenRef.current(''),
            'error-callback': () => aoTokenRef.current(''),
          })
        })
        .catch((err) => console.warn(err))
    }

    const obs = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          obs.disconnect()
          iniciar()
        }
      },
      { rootMargin: '300px' },
    )
    obs.observe(el)

    return () => {
      cancelado = true
      obs.disconnect()
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId)
    }
  }, [versao])

  if (!turnstileAtivo) return null
  return <div ref={ref} className="min-h-[65px]" />
}

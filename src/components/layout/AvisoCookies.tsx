import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { iniciarAnalytics } from '../../lib/analytics'
import { EVENTO_ABRIR_PREFERENCIAS, lerConsentimento, salvarConsentimento, type Consentimento } from '../../lib/consentimento'
import { botao } from '../ui/botao'

/** Aviso de cookies (LGPD). GA4 e Meta Pixel só carregam após "Aceitar". */
export function AvisoCookies() {
  const [visivel, setVisivel] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const atual = lerConsentimento()
    if (atual === 'aceito') iniciarAnalytics()
    else if (atual === null) setVisivel(true)

    const abrir = () => setVisivel(true)
    window.addEventListener(EVENTO_ABRIR_PREFERENCIAS, abrir)
    return () => window.removeEventListener(EVENTO_ABRIR_PREFERENCIAS, abrir)
  }, [])

  // Sobe o botão flutuante do WhatsApp enquanto o aviso estiver aberto.
  useEffect(() => {
    const html = document.documentElement
    const el = ref.current
    if (!visivel || !el) {
      html.style.removeProperty('--altura-aviso-cookies')
      return
    }
    const obs = new ResizeObserver(() => {
      const mobile = window.matchMedia('(max-width: 639px)').matches
      html.style.setProperty('--altura-aviso-cookies', mobile ? `${el.offsetHeight}px` : '0px')
    })
    obs.observe(el)
    return () => {
      obs.disconnect()
      html.style.removeProperty('--altura-aviso-cookies')
    }
  }, [visivel])

  function decidir(v: Consentimento) {
    salvarConsentimento(v)
    setVisivel(false)
    if (v === 'aceito') iniciarAnalytics()
  }

  if (!visivel) return null

  return (
    <div
      ref={ref}
      role="region"
      aria-label="Aviso de cookies"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-marinho/15 bg-white p-4 shadow-[0_-12px_40px_-12px_rgb(6_17_42/0.35)] sm:inset-x-auto sm:bottom-6 sm:left-6 sm:max-w-md sm:border sm:p-6"
    >
      <p className="text-[0.95rem] text-tinta">
        Usamos cookies de análise (Google Analytics e Meta) para entender como o site é usado e melhorar nossos
        serviços. Você pode aceitar ou recusar. Saiba mais na{' '}
        <Link to="/politica-de-privacidade" className="font-medium text-marinho underline underline-offset-2">
          política de privacidade
        </Link>
        .
      </p>
      <div className="mt-4 flex gap-3">
        <button type="button" onClick={() => decidir('aceito')} className={`${botao('primario', 'sm')} flex-1`}>
          Aceitar
        </button>
        <button type="button" onClick={() => decidir('recusado')} className={`${botao('contorno', 'sm')} flex-1`}>
          Recusar
        </button>
      </div>
    </div>
  )
}

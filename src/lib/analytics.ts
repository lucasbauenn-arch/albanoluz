import { GA4_ID, META_PIXEL_ID } from './env'

type Params = Record<string, string | number | boolean | undefined>

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
    fbq?: ((...args: unknown[]) => void) & { callMethod?: unknown; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown }
    _fbq?: unknown
  }
}

let iniciado = false

function carregarScript(src: string) {
  const s = document.createElement('script')
  s.async = true
  s.src = src
  document.head.appendChild(s)
}

/** Carrega GA4 e Meta Pixel. Só deve ser chamado após o consentimento (LGPD). */
export function iniciarAnalytics() {
  if (iniciado || typeof window === 'undefined') return
  iniciado = true

  if (GA4_ID) {
    window.dataLayer = window.dataLayer || []
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments)
    }
    window.gtag('js', new Date())
    window.gtag('config', GA4_ID, { send_page_view: false, anonymize_ip: true })
    carregarScript(`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`)
  }

  if (META_PIXEL_ID) {
    const fbq = function (...args: unknown[]) {
      if (fbq.callMethod) (fbq.callMethod as (...a: unknown[]) => void)(...args)
      else fbq.queue!.push(args)
    } as NonNullable<Window['fbq']>
    fbq.push = fbq
    fbq.loaded = true
    fbq.version = '2.0'
    fbq.queue = []
    window.fbq = fbq
    window._fbq = fbq
    carregarScript('https://connect.facebook.net/en_US/fbevents.js')
    fbq('init', META_PIXEL_ID)
  }

  registrarPagina(window.location.pathname)
}

export function registrarPagina(path: string) {
  if (!iniciado) return
  window.gtag?.('event', 'page_view', { page_path: path, page_location: window.location.href, page_title: document.title })
  window.fbq?.('track', 'PageView')
}

/** Eventos do PRD: `clique_whatsapp` e `lead_enviado`. */
export function track(evento: 'clique_whatsapp' | 'lead_enviado', params: Params = {}) {
  if (!iniciado) return
  window.gtag?.('event', evento, params)
  if (evento === 'lead_enviado') window.fbq?.('track', 'Lead', params)
  else window.fbq?.('trackCustom', evento, params)
}

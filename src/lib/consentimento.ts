export type Consentimento = 'aceito' | 'recusado'

const CHAVE = 'al-consentimento-cookies'
export const EVENTO_ABRIR_PREFERENCIAS = 'al:abrir-preferencias-cookies'

export function lerConsentimento(): Consentimento | null {
  try {
    const v = localStorage.getItem(CHAVE)
    return v === 'aceito' || v === 'recusado' ? v : null
  } catch {
    return null
  }
}

export function salvarConsentimento(v: Consentimento) {
  try {
    localStorage.setItem(CHAVE, v)
  } catch {
    // Navegação privada ou armazenamento bloqueado: vale só para esta visita.
  }
}

export function abrirPreferenciasCookies() {
  window.dispatchEvent(new Event(EVENTO_ABRIR_PREFERENCIAS))
}

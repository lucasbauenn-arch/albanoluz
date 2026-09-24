import { STATUS_LEAD_LABEL, type StatusLead } from '../../types'

export const STATUS_LEAD: StatusLead[] = ['novo', 'em_contato', 'proposta_enviada', 'fechado']

/** Cores do seletor de status (contraste AA sobre o fundo claro). */
export const CLASSE_STATUS: Record<StatusLead, string> = {
  novo: 'border-marinho-300 bg-marinho-50 text-marinho-900',
  em_contato: 'border-amber-300 bg-amber-50 text-amber-950',
  proposta_enviada: 'border-sky-300 bg-sky-50 text-sky-950',
  fechado: 'border-emerald-300 bg-emerald-50 text-emerald-950',
}

export function ehStatusLead(valor: string): valor is StatusLead {
  return Object.hasOwn(STATUS_LEAD_LABEL, valor)
}

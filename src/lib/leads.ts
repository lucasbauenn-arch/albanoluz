import type { PerfilLead } from '../types'
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigurado } from './env'

export interface NovoLead {
  nome: string
  telefone: string
  email?: string
  empresa?: string
  perfil: PerfilLead
  servicos: string[]
  cidade?: string
  areaM2?: string
  mensagem?: string
  origem: string
  consentimento: boolean
  turnstileToken?: string
  /** Campo-isca anti-spam: humanos não preenchem. */
  website?: string
  anexo?: File | null
}

export const ANEXO_MAX_BYTES = 20 * 1024 * 1024
export const ANEXO_EXTENSOES = ['.pdf', '.dwg']

export class ErroEnvio extends Error {}

/** Envia o lead para a Edge Function `enviar-lead` (grava no banco e notifica via n8n). */
export async function enviarLead(lead: NovoLead): Promise<void> {
  if (!supabaseConfigurado) {
    if (import.meta.env.DEV) {
      console.info('[dev] Supabase não configurado; lead simulado:', lead)
      await new Promise((r) => setTimeout(r, 800))
      return
    }
    throw new ErroEnvio('O formulário ainda não está disponível. Fale com a gente pelo WhatsApp.')
  }

  const fd = new FormData()
  fd.set('nome', lead.nome)
  fd.set('telefone', lead.telefone)
  fd.set('perfil', lead.perfil)
  fd.set('servicos', JSON.stringify(lead.servicos))
  fd.set('origem', lead.origem)
  fd.set('consentimento', String(lead.consentimento))
  if (lead.email) fd.set('email', lead.email)
  if (lead.empresa) fd.set('empresa', lead.empresa)
  if (lead.cidade) fd.set('cidade', lead.cidade)
  if (lead.areaM2) fd.set('area_m2', lead.areaM2)
  if (lead.mensagem) fd.set('mensagem', lead.mensagem)
  if (lead.turnstileToken) fd.set('turnstile_token', lead.turnstileToken)
  if (lead.website) fd.set('website', lead.website)
  if (lead.anexo) fd.set('anexo', lead.anexo)

  let res: Response
  try {
    res = await fetch(`${SUPABASE_URL}/functions/v1/enviar-lead`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body: fd,
    })
  } catch {
    throw new ErroEnvio('Não foi possível conectar. Verifique sua internet e tente novamente.')
  }

  const corpo = (await res.json().catch(() => null)) as { ok?: boolean; erro?: string } | null
  if (!res.ok || !corpo?.ok) {
    throw new ErroEnvio(corpo?.erro || 'Não foi possível enviar agora. Tente novamente ou chame no WhatsApp.')
  }
}

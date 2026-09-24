import { SERVICOS } from '../data/servicos'

/** Estado de uma carga assíncrona. */
export type Carga<T> = { tipo: 'carregando' } | { tipo: 'erro'; mensagem: string } | { tipo: 'ok'; dados: T }

/** Erro com mensagem já pronta para o usuário (em português). */
export class ErroPainel extends Error {}

/** Retorno de update/delete com `.select('id')`: RLS pode filtrar sem gerar erro. */
export function garantirAfetado(dados: unknown[] | null): void {
  if (!dados || dados.length === 0) {
    throw new ErroPainel('Nenhum registro foi alterado. Ele pode ter sido excluído, ou seu usuário não tem permissão.')
  }
}

// -----------------------------------------------------------------------------
// Texto
// -----------------------------------------------------------------------------

/** Remove acentos e passa para minúsculas (busca e slug). */
export function semAcentos(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

export const SLUG_VALIDO = /^[a-z0-9]+(-[a-z0-9]+)*$/

export function gerarSlug(texto: string): string {
  return semAcentos(texto)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '')
}

/** Converte string vazia em null (campos opcionais do banco). */
export function ouNulo(valor: string): string | null {
  const limpo = valor.trim()
  return limpo ? limpo : null
}

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

// -----------------------------------------------------------------------------
// Datas e números (pt-BR, horário de Brasília)
// -----------------------------------------------------------------------------

const FUSO = 'America/Sao_Paulo'

const fmtDataHora = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: FUSO,
})

const fmtData = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: FUSO,
})

export const formatarDataHora = (iso: string) => fmtDataHora.format(new Date(iso))
export const formatarData = (iso: string) => fmtData.format(new Date(iso))

export function formatarArea(area: number): string {
  return `${area.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} m²`
}

export function dataParaArquivo(data = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${data.getFullYear()}-${p(data.getMonth() + 1)}-${p(data.getDate())}`
}

// -----------------------------------------------------------------------------
// Serviços
// -----------------------------------------------------------------------------

const MAPA_SERVICOS = new Map(SERVICOS.map((s) => [s.slug, s]))

export const nomeServicoCurto = (slug: string) => MAPA_SERVICOS.get(slug)?.nomeCurto ?? slug
export const nomeServicoCompleto = (slug: string) => MAPA_SERVICOS.get(slug)?.nome ?? slug

// -----------------------------------------------------------------------------
// Contato
// -----------------------------------------------------------------------------

/** Dígitos do telefone com DDI 55 (acrescentado se faltar). */
export function numeroWhatsApp(telefone: string): string | null {
  let d = telefone.replace(/\D/g, '').replace(/^0+/, '')
  if (d.length < 8) return null
  if (!d.startsWith('55') || d.length <= 11) d = `55${d}`
  return d
}

export function linkWhatsApp(telefone: string, mensagem?: string): string | null {
  const numero = numeroWhatsApp(telefone)
  if (!numero) return null
  return `https://wa.me/${numero}${mensagem ? `?text=${encodeURIComponent(mensagem)}` : ''}`
}

/** "2026/09/<uuid>-planta-baixa.pdf" → "planta-baixa.pdf" */
export function nomeDoAnexo(caminho: string): string {
  const arquivo = caminho.split('/').pop() ?? caminho
  return arquivo.replace(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i, '')
}

// -----------------------------------------------------------------------------
// Erros (Supabase Auth, PostgREST, Storage) em português
// -----------------------------------------------------------------------------

type ErroGenerico = { message?: unknown; code?: unknown; status?: unknown }

export function mensagemErro(erro: unknown, padrao = 'Ocorreu um erro inesperado.'): string {
  if (!erro) return padrao
  if (erro instanceof ErroPainel) return erro.message
  const e: ErroGenerico = typeof erro === 'object' ? (erro as ErroGenerico) : { message: String(erro) }
  const msg = typeof e.message === 'string' ? e.message : ''
  const code = typeof e.code === 'string' ? e.code : ''

  if (/failed to fetch|networkerror|load failed|network request failed/i.test(msg)) {
    return 'Sem conexão com o servidor. Verifique a internet e tente novamente.'
  }

  switch (code) {
    case 'invalid_credentials':
      return 'E-mail ou senha incorretos.'
    case 'email_not_confirmed':
      return 'Este e-mail ainda não foi confirmado.'
    case 'user_banned':
      return 'Este usuário está bloqueado.'
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.'
    case 'weak_password':
      return 'Senha fraca. Use pelo menos 8 caracteres, misturando letras e números.'
    case 'same_password':
      return 'A nova senha precisa ser diferente da atual.'
    case 'session_not_found':
    case 'refresh_token_not_found':
    case 'PGRST301':
    case 'PGRST303':
      return 'Sua sessão expirou. Entre novamente.'
    case '23505':
      return 'Já existe um registro com esse valor (por exemplo, o mesmo endereço/slug).'
    case '23514':
      return 'Algum campo tem um valor fora do permitido.'
    case '42501':
      return 'Sem permissão para esta ação. Confirme se seu usuário é administrador.'
    case '42P01':
    case 'PGRST205':
      return 'Tabela não encontrada no banco. A migração foi aplicada? Veja supabase/README.md.'
    case '42883':
    case 'PGRST202':
      return 'Função não encontrada no banco. A migração foi aplicada? Veja supabase/README.md.'
  }

  if (/invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.'
  if (/row-level security|permission denied/i.test(msg)) {
    return 'Sem permissão para esta ação. Confirme se seu usuário é administrador.'
  }
  if (/jwt expired/i.test(msg)) return 'Sua sessão expirou. Entre novamente.'
  if (/maximum allowed size|payload too large|too large/i.test(msg)) return 'Arquivo grande demais.'
  if (/mime type|invalid_mime_type/i.test(msg)) return 'Tipo de arquivo não permitido.'
  if (/bucket not found/i.test(msg)) {
    return 'Bucket de arquivos não encontrado. A migração foi aplicada? Veja supabase/README.md.'
  }
  if (/object not found|not_found/i.test(msg)) return 'Arquivo não encontrado.'

  return msg ? `${padrao} Detalhe técnico: ${msg}` : padrao
}

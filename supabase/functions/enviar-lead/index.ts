// Edge function "enviar-lead"
//
// Recebe o formulário de orçamento do site (multipart/form-data), valida,
// limita envios repetidos, guarda o anexo no bucket privado "anexos", grava o
// lead com a service role e avisa o n8n (e-mail + WhatsApp da equipe).
//
// Requer a migração 20260929130000_limites_envio.sql (coluna leads.origem_hash
// e trigger de limite), aplicada antes do deploy.
//
// Deploy:  supabase functions deploy enviar-lead --no-verify-jwt
// Secrets: ver supabase/README.md

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.117.2'

// -----------------------------------------------------------------------------
// Configuração
// -----------------------------------------------------------------------------

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const TURNSTILE_SECRET_KEY = Deno.env.get('TURNSTILE_SECRET_KEY') ?? ''
const N8N_WEBHOOK_URL = Deno.env.get('N8N_WEBHOOK_URL') ?? ''
const N8N_WEBHOOK_SECRET = Deno.env.get('N8N_WEBHOOK_SECRET') ?? ''
const SITE_URL = (Deno.env.get('SITE_URL') ?? 'https://albanoluz.com').replace(/\/$/, '')

const ORIGENS_PADRAO = [
  'https://albanoluz.com',
  'https://www.albanoluz.com',
  'http://localhost:5173',
  'http://localhost:4173',
]

const ORIGENS_PERMITIDAS = (() => {
  const lista = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean)
  return new Set(lista.length ? lista : ORIGENS_PADRAO)
})()

const BUCKET_ANEXOS = 'anexos'
const TAMANHO_MAX_ANEXO = 20 * 1024 * 1024 // 20 MB
const TAMANHO_MAX_REQUISICAO = TAMANHO_MAX_ANEXO + 1024 * 1024 // anexo + campos
const VALIDADE_LINK_ANEXO = 60 * 60 * 24 * 7 // 7 dias

// Limites de envio (antiabuso, valem mesmo sem Turnstile). Quem garante é o
// trigger public.limitar_envios_leads (migração 20260929130000_limites_envio.sql);
// a função repete os números numa pré-checagem. Mude os dois juntos.
const JANELA_LIMITE_MS = 10 * 60 * 1000 // 10 minutos
const LIMITE_POR_TELEFONE = 3 // leads do mesmo telefone na janela
const LIMITE_POR_ORIGEM = 5 // leads da mesma origem (hash do IP) na janela
const JANELA_ANEXOS_MS = 60 * 60 * 1000 // 1 hora
const LIMITE_ANEXOS = 10 // leads com anexo na janela de 1 hora, no total
// Disjuntor: acima deste total na janela de 10 minutos o lead é gravado, mas o
// n8n não é avisado. Nenhum pedido é recusado pelo volume total.
const LIMITE_NOTIFICACOES = 30
const WHATSAPP_EXIBICAO = '(11) 93274-2355' // mesmo número de src/config/site.ts

// Sal do hash da origem (secret opcional LIMITE_SAL). Sem ele, o sal sai da URL
// e da chave do projeto: continua fora do banco, mas muda se a chave for trocada.
const LIMITE_SAL = Deno.env.get('LIMITE_SAL') ?? ''
const SAL_ORIGEM = LIMITE_SAL || `enviar-lead|${SUPABASE_URL}|${SERVICE_ROLE_KEY}`
if (!LIMITE_SAL) {
  console.warn(
    'LIMITE_SAL não definido: o hash da origem usa um sal derivado de SUPABASE_URL e da service role. Defina o secret LIMITE_SAL (ver supabase/README.md).',
  )
}

// Mesmos slugs/nomes de src/data/servicos.ts
const SERVICOS: Record<string, string> = {
  estrutural: 'Projeto Estrutural',
  fundacao: 'Projeto de Fundação',
  eletrico: 'Projeto Elétrico',
  hidraulico: 'Projeto Hidráulico',
  incendio: 'Projeto de Combate a Incêndio',
  arquitetura: 'Projeto de Arquitetura',
  executivo: 'Projeto Executivo',
  'modelagem-3d': 'Modelagem 3D e Maquete Eletrônica',
  'execucao-de-obras': 'Execução de Obras',
}

const PERFIS = {
  arquiteto: 'Arquiteto(a)',
  construtora: 'Construtora / incorporadora',
  particular: 'Dono de obra / particular',
} as const

type Perfil = keyof typeof PERFIS

const ANEXOS_ACEITOS: Record<string, { contentType: string; assinatura: (b: Uint8Array) => boolean }> = {
  pdf: {
    contentType: 'application/pdf',
    // "%PDF-"
    assinatura: (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46,
  },
  dwg: {
    contentType: 'application/acad',
    // "AC10xx" (todas as versões de DWG começam com "AC")
    assinatura: (b) => b[0] === 0x41 && b[1] === 0x43,
  },
}

// -----------------------------------------------------------------------------
// Utilitários de resposta
// -----------------------------------------------------------------------------

class ErroHttp extends Error {
  status: number
  constructor(status: number, mensagem: string) {
    super(mensagem)
    this.status = status
  }
}

function cabecalhosCors(origem: string | null): Headers {
  const h = new Headers({
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  })
  if (origem && ORIGENS_PERMITIDAS.has(origem)) h.set('Access-Control-Allow-Origin', origem)
  return h
}

function json(status: number, corpo: unknown, cors: Headers): Response {
  const h = new Headers(cors)
  h.set('Content-Type', 'application/json; charset=utf-8')
  return new Response(JSON.stringify(corpo), { status, headers: h })
}

// -----------------------------------------------------------------------------
// Validação
// -----------------------------------------------------------------------------

function texto(form: FormData, campo: string, max: number, rotulo: string): string | null {
  const valor = form.get(campo)
  if (valor === null || valor instanceof File) return null
  const limpo = valor.replaceAll(String.fromCharCode(0), '').trim()
  if (!limpo) return null
  if (limpo.length > max) throw new ErroHttp(400, `${rotulo} deve ter no máximo ${max} caracteres.`)
  return limpo
}

function obrigatorio(form: FormData, campo: string, max: number, rotulo: string): string {
  const valor = texto(form, campo, max, rotulo)
  if (!valor) throw new ErroHttp(400, `Preencha o campo ${rotulo.toLowerCase()}.`)
  return valor
}

function lerServicos(form: FormData): string[] {
  const brutos = form.getAll('servicos').filter((v): v is string => typeof v === 'string')
  let lista: unknown[] = []
  if (brutos.length === 1 && brutos[0].trim().startsWith('[')) {
    try {
      const convertido: unknown = JSON.parse(brutos[0])
      if (Array.isArray(convertido)) lista = convertido
    } catch {
      throw new ErroHttp(400, 'Lista de serviços inválida.')
    }
  } else {
    lista = brutos.flatMap((v) => v.split(','))
  }
  const slugs = lista
    .filter((s): s is string => typeof s === 'string')
    .map((s) => s.trim())
    .filter((s) => Object.hasOwn(SERVICOS, s))
  return [...new Set(slugs)]
}

function lerArea(form: FormData): number | null {
  const bruto = texto(form, 'area_m2', 30, 'Área')
  if (!bruto) return null
  let normalizado = bruto.replace(/\s|m²|m2/gi, '')
  // Aceita "1.234,5" e "1.234" (pt-BR) e "1234.5"
  if (normalizado.includes(',')) {
    normalizado = normalizado.replace(/\./g, '').replace(',', '.')
  } else if (/^[1-9]\d{0,2}(\.\d{3})+$/.test(normalizado)) {
    // Sem vírgula, "1.234" e "12.500" são milhares, não decimais
    normalizado = normalizado.replace(/\./g, '')
  }
  // Arredonda antes de validar: "0,004" viraria 0 e violaria o CHECK area_m2 > 0
  const area = Math.round(Number(normalizado) * 100) / 100
  if (!Number.isFinite(area) || area <= 0 || area > 10_000_000) {
    throw new ErroHttp(400, 'Informe a área aproximada em m² (apenas números).')
  }
  return area
}

function sanitizarNomeArquivo(nome: string): string {
  const partes = nome.split(/[\\/]/)
  const base = (partes[partes.length - 1] || 'anexo')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
  const ponto = base.lastIndexOf('.')
  const ext = ponto > 0 ? base.slice(ponto + 1).replace(/[^a-z0-9]/g, '') : ''
  const semExt = (ponto > 0 ? base.slice(0, ponto) : base)
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 80) || 'anexo'
  return ext ? `${semExt}.${ext}` : semExt
}

async function validarAnexo(valor: FormDataEntryValue | null) {
  if (!(valor instanceof File) || valor.size === 0) return null
  if (valor.size > TAMANHO_MAX_ANEXO) throw new ErroHttp(413, 'O anexo deve ter no máximo 20 MB.')

  const nome = sanitizarNomeArquivo(valor.name || 'anexo')
  const ext = nome.includes('.') ? nome.slice(nome.lastIndexOf('.') + 1) : ''
  const tipo = Object.hasOwn(ANEXOS_ACEITOS, ext) ? ANEXOS_ACEITOS[ext] : null
  if (!tipo) throw new ErroHttp(400, 'O anexo deve ser um arquivo PDF ou DWG.')

  const bytes = new Uint8Array(await valor.arrayBuffer())
  if (!tipo.assinatura(bytes)) {
    throw new ErroHttp(400, `O arquivo enviado não parece ser um ${ext.toUpperCase()} válido.`)
  }
  return { nome, bytes, contentType: tipo.contentType }
}

// IP do cliente. O Supabase fica atrás do Cloudflare, que sobrescreve
// cf-connecting-ip (conferido em produção em 29/09/2026: chega com o IP real do
// visitante). x-forwarded-for NÃO é usado: o último item é o IP do gateway da
// AWS, e usá-lo faria todos os visitantes dividirem o mesmo limite. Sem IP
// confiável, origem_hash fica nulo e o limite por origem não se aplica.
function ipDoCliente(req: Request): string | null {
  const candidatos = [req.headers.get('cf-connecting-ip'), req.headers.get('x-real-ip')]
  for (const candidato of candidatos) {
    const ip = candidato?.trim().toLowerCase() ?? ''
    if (ip.length <= 45 && /^[0-9a-f:.]*[.:][0-9a-f:.]*$/.test(ip)) return ip
  }
  return null
}

// Rede usada no limite: o IPv4 inteiro ou, no IPv6, o prefixo /64 (um cliente
// costuma receber o /64 inteiro e troca de endereço dentro dele à vontade).
function redeDoIp(ip: string): string {
  const v4 = /^(?:::ffff:)?(\d{1,3}(?:\.\d{1,3}){3})$/.exec(ip)
  if (v4) return v4[1]
  const [inicio, fim] = ip.split('::')
  const antes = inicio ? inicio.split(':') : []
  const depois = fim ? fim.split(':') : []
  const zeros = Array<string>(Math.max(0, 8 - antes.length - depois.length)).fill('0')
  const grupos = [...antes, ...zeros, ...depois].slice(0, 4)
  return `${grupos.map((g) => (parseInt(g, 16) || 0).toString(16)).join(':')}::/64`
}

// SHA-256 (hex) do sal + rede do cliente. O IP puro nunca sai da função.
async function hashDaOrigem(ip: string | null): Promise<string | null> {
  if (!ip) return null
  const dados = new TextEncoder().encode(`${SAL_ORIGEM}|${redeDoIp(ip)}`)
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', dados))
  return Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join('')
}

async function verificarTurnstile(token: string | null, ip: string | null): Promise<void> {
  if (!TURNSTILE_SECRET_KEY) return
  if (!token) {
    throw new ErroHttp(400, 'Confirme a verificação anti-spam antes de enviar.')
  }
  const corpo = new URLSearchParams({ secret: TURNSTILE_SECRET_KEY, response: token })
  if (ip) corpo.set('remoteip', ip)
  let sucesso = false
  try {
    const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: corpo,
      signal: AbortSignal.timeout(8000),
    })
    const dados = (await resp.json()) as { success?: boolean; 'error-codes'?: string[] }
    sucesso = dados.success === true
    if (!sucesso) console.warn('Turnstile recusou o token:', dados['error-codes'])
  } catch (erro) {
    console.error('Falha ao consultar o Turnstile:', erro)
    throw new ErroHttp(503, 'Não foi possível validar a verificação anti-spam. Tente novamente em instantes.')
  }
  if (!sucesso) {
    throw new ErroHttp(400, 'A verificação anti-spam falhou ou expirou. Recarregue a página e tente novamente.')
  }
}

// -----------------------------------------------------------------------------
// Limite de envios
// -----------------------------------------------------------------------------

type Limite = 'telefone' | 'origem' | 'anexos'

const MENSAGENS_LIMITE: Record<Limite, string> = {
  telefone:
    `Já recebemos alguns pedidos deste telefone agora há pouco. Aguarde alguns minutos ou fale com a gente pelo WhatsApp ${WHATSAPP_EXIBICAO}.`,
  origem:
    `Já recebemos vários pedidos da sua conexão agora há pouco. Aguarde alguns minutos ou fale com a gente pelo WhatsApp ${WHATSAPP_EXIBICAO}.`,
  anexos:
    `Estamos recebendo muitos arquivos neste momento. Envie o pedido sem o anexo ou mande o arquivo pelo WhatsApp ${WHATSAPP_EXIBICAO}.`,
}

// Recusa do trigger (SQLSTATE PT429, que o PostgREST devolve como HTTP 429). A
// mensagem do banco diz qual limite foi atingido: limite_telefone, limite_origem
// ou limite_anexos.
function erroDeLimite(mensagemBanco: string | undefined): ErroHttp {
  const limite = (mensagemBanco ?? '').replace(/^limite_/, '')
  const texto = Object.hasOwn(MENSAGENS_LIMITE, limite)
    ? MENSAGENS_LIMITE[limite as Limite]
    : `Recebemos muitos pedidos agora há pouco. Aguarde alguns minutos ou fale com a gente pelo WhatsApp ${WHATSAPP_EXIBICAO}.`
  return new ErroHttp(429, texto)
}

// Em HEAD o PostgREST não devolve corpo de erro, então o log leva o status HTTP.
type Contagem = { count: number | null; status: number; error: { message: string } | null }

function contarLeads(admin: SupabaseClient, janelaMs: number, aPartir = Date.now()) {
  return admin
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', new Date(aPartir - janelaMs).toISOString())
}

// Pré-checagem barata, antes do upload, para não guardar anexo à toa. Quem
// garante os limites é o trigger, que conta de novo sob lock na transação do
// insert. Se uma contagem falhar, registra no log e segue: o trigger continua
// valendo, e é melhor receber spam do que perder um pedido.
async function verificarLimiteEnvios(
  admin: SupabaseClient,
  envio: { digitos: string; origemHash: string | null; comAnexo: boolean },
): Promise<void> {
  // O telefone é gravado como digitado; a regex casa os mesmos dígitos, na mesma
  // ordem, com qualquer pontuação entre eles ("(11) 91234-5678" = "11912345678").
  const mesmoTelefone = `^\\D*${envio.digitos.split('').join('\\D*')}\\D*$`

  const consultas: [Limite, number, PromiseLike<Contagem>][] = [
    ['telefone', LIMITE_POR_TELEFONE, contarLeads(admin, JANELA_LIMITE_MS).regexMatch('telefone', mesmoTelefone)],
  ]
  if (envio.origemHash) {
    consultas.push(['origem', LIMITE_POR_ORIGEM, contarLeads(admin, JANELA_LIMITE_MS).eq('origem_hash', envio.origemHash)])
  }
  if (envio.comAnexo) {
    consultas.push(['anexos', LIMITE_ANEXOS, contarLeads(admin, JANELA_ANEXOS_MS).not('anexo_path', 'is', null)])
  }

  const excedidos = await Promise.all(
    consultas.map(async ([limite, maximo, consulta]) => {
      try {
        const r = await consulta
        if (r.error || r.count === null) {
          console.error(`Falha ao contar os envios (${limite}) (HTTP ${r.status}):`, r.error?.message || 'sem contagem')
          return null
        }
        return r.count >= maximo ? limite : null
      } catch (erro) {
        console.error(`Falha ao consultar o limite de envios (${limite}):`, erro)
        return null
      }
    }),
  )
  const excedido = excedidos.find((l) => l !== null)
  if (excedido) throw new ErroHttp(429, MENSAGENS_LIMITE[excedido])
}

// -----------------------------------------------------------------------------
// Notificação (n8n)
// -----------------------------------------------------------------------------

type LeadGravado = {
  id: string
  created_at: string
  nome: string
  telefone: string
  email: string | null
  empresa: string | null
  perfil: Perfil
  servicos: string[]
  cidade: string | null
  area_m2: number | null
  mensagem: string | null
  anexo_path: string | null
  origem: string | null
  consentimento: boolean
  status: string
}

function linkWhatsApp(telefone: string): string | null {
  let d = telefone.replace(/\D/g, '').replace(/^0+/, '')
  if (d.length < 8) return null
  if (!d.startsWith('55') || d.length <= 11) d = `55${d}`
  return `https://wa.me/${d}`
}

async function notificarN8n(admin: SupabaseClient, lead: LeadGravado): Promise<void> {
  if (!N8N_WEBHOOK_URL) return
  try {
    let anexoUrl: string | null = null
    if (lead.anexo_path) {
      const { data, error } = await admin.storage
        .from(BUCKET_ANEXOS)
        .createSignedUrl(lead.anexo_path, VALIDADE_LINK_ANEXO)
      if (error) console.error('Falha ao gerar link do anexo:', error.message)
      anexoUrl = data?.signedUrl ?? null
    }

    const payload = {
      evento: 'lead_enviado',
      lead,
      perfil_label: PERFIS[lead.perfil],
      servicos_labels: lead.servicos.map((s) => SERVICOS[s] ?? s),
      anexo_url: anexoUrl,
      whatsapp_url: linkWhatsApp(lead.telefone),
      painel_url: `${SITE_URL}/admin?aba=leads&lead=${lead.id}`,
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (N8N_WEBHOOK_SECRET) headers['x-webhook-secret'] = N8N_WEBHOOK_SECRET

    const resp = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    })
    if (!resp.ok) {
      console.error(`n8n respondeu ${resp.status}:`, (await resp.text()).slice(0, 500))
    }
  } catch (erro) {
    // Falha de notificação não invalida o lead, que já está salvo no banco.
    console.error('Falha ao notificar o n8n:', erro)
  }
}

// Disjuntor: acima de LIMITE_NOTIFICACOES leads nos 10 minutos (este incluído),
// o lead fica gravado e aparece no painel, mas o n8n não é chamado. Assim um
// ataque com telefones e IPs variados não lota o e-mail e o WhatsApp da equipe.
// Se a contagem falhar, avisa mesmo assim.
async function notificarEquipe(admin: SupabaseClient, lead: LeadGravado): Promise<void> {
  if (!N8N_WEBHOOK_URL) return
  const gravadoEm = Date.parse(lead.created_at)
  try {
    const { count, status, error } = await contarLeads(
      admin,
      JANELA_LIMITE_MS,
      Number.isNaN(gravadoEm) ? Date.now() : gravadoEm,
    )
    if (error || count === null) {
      console.error(
        `Falha ao contar os envios recentes (HTTP ${status}); avisando o n8n mesmo assim:`,
        error?.message || 'sem contagem',
      )
    } else if (count > LIMITE_NOTIFICACOES) {
      console.warn(`Disjuntor: ${count} leads nos últimos 10 minutos. Lead ${lead.id} gravado sem avisar o n8n.`)
      return
    }
  } catch (erro) {
    console.error('Falha ao contar os envios recentes; avisando o n8n mesmo assim:', erro)
  }
  await notificarN8n(admin, lead)
}

declare const EdgeRuntime: { waitUntil(promessa: Promise<unknown>): void } | undefined

function emSegundoPlano(promessa: Promise<unknown>): Promise<unknown> | void {
  if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime?.waitUntil) {
    EdgeRuntime.waitUntil(promessa)
    return
  }
  return promessa
}

// -----------------------------------------------------------------------------
// Handler
// -----------------------------------------------------------------------------

Deno.serve(async (req) => {
  const origem = req.headers.get('origin')
  const cors = cabecalhosCors(origem)

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }

  if (req.method !== 'POST') {
    return json(405, { ok: false, erro: 'Método não permitido.' }, cors)
  }

  if (origem && !ORIGENS_PERMITIDAS.has(origem)) {
    return json(403, { ok: false, erro: 'Origem não autorizada.' }, cors)
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY ausentes.')
    return json(500, { ok: false, erro: 'Serviço indisponível no momento.' }, cors)
  }

  let anexoEnviado: string | null = null
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })

  try {
    // Sem Content-Length (Transfer-Encoding: chunked) o corpo inteiro seria lido
    // na memória antes de qualquer limite. Navegadores sempre enviam o cabeçalho.
    const tamanho = req.headers.get('content-length')?.trim() ?? ''
    if (!/^\d+$/.test(tamanho)) {
      throw new ErroHttp(411, 'Não foi possível ler o envio. Atualize a página e tente novamente.')
    }
    if (Number(tamanho) > TAMANHO_MAX_REQUISICAO) {
      throw new ErroHttp(413, 'O anexo deve ter no máximo 20 MB.')
    }

    const tipoConteudo = req.headers.get('content-type') ?? ''
    if (!/multipart\/form-data|application\/x-www-form-urlencoded/i.test(tipoConteudo)) {
      throw new ErroHttp(415, 'Formato de envio inválido.')
    }

    let form: FormData
    try {
      form = await req.formData()
    } catch {
      throw new ErroHttp(400, 'Não foi possível ler os dados do formulário.')
    }

    // Honeypot: robôs preenchem o campo oculto "website". Fingimos sucesso.
    const honeypot = form.get('website')
    if (typeof honeypot === 'string' && honeypot.trim() !== '') {
      return json(200, { ok: true }, cors)
    }

    // --- Campos ---
    const nome = obrigatorio(form, 'nome', 120, 'Nome')
    if (nome.length < 2) throw new ErroHttp(400, 'Informe seu nome.')

    const telefone = obrigatorio(form, 'telefone', 30, 'Telefone')
    const digitos = telefone.replace(/\D/g, '')
    if (digitos.length < 10 || digitos.length > 15) {
      throw new ErroHttp(400, 'Informe um telefone válido com DDD.')
    }

    const email = texto(form, 'email', 160, 'E-mail')?.toLowerCase() ?? null
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      throw new ErroHttp(400, 'Informe um e-mail válido.')
    }

    const empresa = texto(form, 'empresa', 160, 'Empresa')

    const perfilBruto = texto(form, 'perfil', 20, 'Perfil')
    if (!perfilBruto || !Object.hasOwn(PERFIS, perfilBruto)) {
      throw new ErroHttp(400, 'Selecione seu perfil: arquiteto(a), construtora ou particular.')
    }
    const perfil = perfilBruto as Perfil

    const servicos = lerServicos(form)
    const cidade = texto(form, 'cidade', 120, 'Cidade')
    const area_m2 = lerArea(form)
    const mensagem = texto(form, 'mensagem', 5000, 'Mensagem')
    const origemPagina = texto(form, 'origem', 300, 'Origem')

    if (form.get('consentimento') !== 'true') {
      throw new ErroHttp(400, 'Para enviar, é preciso concordar com o uso dos seus dados conforme a política de privacidade.')
    }

    const anexo = await validarAnexo(form.get('anexo'))

    // --- Anti-spam (depois da validação, para não gastar o token à toa) ---
    const ip = ipDoCliente(req)
    const token = texto(form, 'turnstile_token', 4096, 'Verificação')
    await verificarTurnstile(token, ip)

    // --- Limite de envios (antes do upload, para não guardar anexo à toa) ---
    const origemHash = await hashDaOrigem(ip)
    await verificarLimiteEnvios(admin, { digitos, origemHash, comAnexo: anexo !== null })

    // --- Anexo ---
    let anexo_path: string | null = null
    if (anexo) {
      const agora = new Date()
      const ano = agora.getUTCFullYear()
      const mes = String(agora.getUTCMonth() + 1).padStart(2, '0')
      anexo_path = `${ano}/${mes}/${crypto.randomUUID()}-${anexo.nome}`
      const { error } = await admin.storage.from(BUCKET_ANEXOS).upload(anexo_path, anexo.bytes, {
        contentType: anexo.contentType,
        upsert: false,
      })
      if (error) {
        console.error('Falha no upload do anexo:', error.message)
        throw new ErroHttp(500, 'Não foi possível enviar o anexo. Tente novamente ou envie sem o arquivo.')
      }
      anexoEnviado = anexo_path
    }

    // --- Lead ---
    const linha: Record<string, unknown> = {
      nome,
      telefone,
      email,
      empresa,
      perfil,
      servicos,
      cidade,
      area_m2,
      mensagem,
      anexo_path,
      origem: origemPagina,
      origem_hash: origemHash,
      consentimento: true,
    }
    const inserir = () =>
      admin
        .from('leads')
        .insert(linha)
        .select(
          'id, created_at, nome, telefone, email, empresa, perfil, servicos, cidade, area_m2, mensagem, anexo_path, origem, consentimento, status',
        )
        .single()

    let { data, error } = await inserir()
    // Função publicada antes da migração 20260929130000_limites_envio.sql: grava
    // sem o hash para não perder o pedido (e deixa o erro no log).
    if (error?.code === 'PGRST204' && error.message?.includes('origem_hash')) {
      console.error(
        'Coluna leads.origem_hash ausente: aplique a migração 20260929130000_limites_envio.sql. Gravando o lead sem o hash da origem.',
      )
      delete linha.origem_hash
      ;({ data, error } = await inserir())
    }

    if (error?.code === 'PT429') {
      // O trigger recusou (envios simultâneos ou pré-checagem que falhou). O
      // catch remove o anexo que acabou de subir.
      console.warn(`Limite de envios recusou o lead no banco: ${error.message}`)
      throw erroDeLimite(error.message)
    }
    if (error || !data) {
      console.error('Falha ao gravar o lead:', error?.message)
      throw new ErroHttp(500, 'Não foi possível registrar seu pedido. Tente novamente ou fale conosco pelo WhatsApp.')
    }

    const lead = data as LeadGravado
    anexoEnviado = null // gravado com sucesso; não remover

    await emSegundoPlano(notificarEquipe(admin, lead))

    return json(200, { ok: true, id: lead.id }, cors)
  } catch (erro) {
    if (anexoEnviado) {
      const { error } = await admin.storage.from(BUCKET_ANEXOS).remove([anexoEnviado])
      if (error) console.error('Falha ao remover anexo órfão:', error.message)
    }
    if (erro instanceof ErroHttp) {
      return json(erro.status, { ok: false, erro: erro.message }, cors)
    }
    console.error('Erro inesperado:', erro)
    return json(500, { ok: false, erro: 'Erro inesperado. Tente novamente em instantes.' }, cors)
  }
})

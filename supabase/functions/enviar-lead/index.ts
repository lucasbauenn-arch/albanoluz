// Edge function "enviar-lead"
//
// Recebe o formulário de orçamento do site (multipart/form-data), valida,
// guarda o anexo no bucket privado "anexos", grava o lead com a service role
// e avisa o n8n (e-mail + WhatsApp da equipe).
//
// Deploy:  supabase functions deploy enviar-lead --no-verify-jwt
// Secrets: ver supabase/README.md

import { createClient } from 'npm:@supabase/supabase-js@2'

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
  // Aceita "1.234,5" (pt-BR) e "1234.5"
  if (normalizado.includes(',')) normalizado = normalizado.replace(/\./g, '').replace(',', '.')
  const area = Number(normalizado)
  if (!Number.isFinite(area) || area <= 0 || area > 10_000_000) {
    throw new ErroHttp(400, 'Informe a área aproximada em m² (apenas números).')
  }
  return Math.round(area * 100) / 100
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

function ipDoCliente(req: Request): string | null {
  const cf = req.headers.get('cf-connecting-ip')
  if (cf) return cf.trim()
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim() || null
  return null
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

async function notificarN8n(
  admin: ReturnType<typeof createClient>,
  lead: LeadGravado,
): Promise<void> {
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
    const tamanho = Number(req.headers.get('content-length') ?? '0')
    if (tamanho > TAMANHO_MAX_REQUISICAO) {
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
    const token = texto(form, 'turnstile_token', 4096, 'Verificação')
    await verificarTurnstile(token, ipDoCliente(req))

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
    const { data, error } = await admin
      .from('leads')
      .insert({
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
        consentimento: true,
      })
      .select(
        'id, created_at, nome, telefone, email, empresa, perfil, servicos, cidade, area_m2, mensagem, anexo_path, origem, consentimento, status',
      )
      .single()

    if (error || !data) {
      console.error('Falha ao gravar o lead:', error?.message)
      throw new ErroHttp(500, 'Não foi possível registrar seu pedido. Tente novamente ou fale conosco pelo WhatsApp.')
    }

    const lead = data as LeadGravado
    anexoEnviado = null // gravado com sucesso; não remover

    await emSegundoPlano(notificarN8n(admin, lead))

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

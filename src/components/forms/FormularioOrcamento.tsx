import { CircleCheck, LoaderCircle, Paperclip, Send, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'
import { SERVICOS } from '../../data/servicos'
import { track } from '../../lib/analytics'
import { ANEXO_EXTENSOES, ANEXO_MAX_BYTES, ErroEnvio, enviarLead } from '../../lib/leads'
import { PERFIL_LABEL, type PerfilLead } from '../../types'
import { BotaoWhatsApp } from '../BotaoWhatsApp'
import { botao } from '../ui/botao'
import { Turnstile, turnstileAtivo } from './Turnstile'

type Campo = 'nome' | 'telefone' | 'email' | 'perfil' | 'consentimento' | 'anexo' | 'turnstile' | 'area'

interface Props {
  variante?: 'completo' | 'curto'
}

const PERFIS = Object.keys(PERFIL_LABEL) as PerfilLead[]

function mascaraTelefone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

const formatarMb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`

const estiloCampo = (erro?: string) =>
  `mt-1.5 block w-full rounded-[2px] border bg-white px-3.5 py-3 text-base text-tinta placeholder:text-grafite/60 transition-colors focus:border-marinho focus-visible:outline-2 focus-visible:outline-offset-0 ${
    erro ? 'border-red-700' : 'border-marinho/25 hover:border-marinho/50'
  }`

function Rotulo({ htmlFor, children, opcional }: { htmlFor: string; children: ReactNode; opcional?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-tinta">
      {children}
      {opcional ? <span className="font-normal text-grafite"> (opcional)</span> : <span aria-hidden="true" className="text-red-700"> *</span>}
    </label>
  )
}

function MensagemErro({ id, erro }: { id: string; erro?: string }) {
  if (!erro) return null
  return (
    <p id={id} className="mt-1.5 text-sm font-medium text-red-800">
      {erro}
    </p>
  )
}

export function FormularioOrcamento({ variante = 'completo' }: Props) {
  const completo = variante === 'completo'
  const uid = useId()
  const id = (nome: string) => `${uid}-${nome}`
  const formRef = useRef<HTMLFormElement>(null)
  const sucessoRef = useRef<HTMLDivElement>(null)

  const [nome, setNome] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail] = useState('')
  const [perfil, setPerfil] = useState<PerfilLead | ''>('')
  const [servicos, setServicos] = useState<string[]>([])
  const [cidade, setCidade] = useState('')
  const [area, setArea] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [website, setWebsite] = useState('')
  const [anexo, setAnexo] = useState<File | null>(null)
  const [consentimento, setConsentimento] = useState(false)
  const [token, setToken] = useState('')
  const [versaoTurnstile, setVersaoTurnstile] = useState(0)

  const [erros, setErros] = useState<Partial<Record<Campo, string>>>({})
  const [status, setStatus] = useState<'ocioso' | 'enviando' | 'sucesso'>('ocioso')
  const [erroEnvio, setErroEnvio] = useState('')

  // Serviço vindo das páginas de serviço: /contato?servico=estrutural
  useEffect(() => {
    if (!completo) return
    const s = new URLSearchParams(window.location.search).get('servico')
    if (s && SERVICOS.some((x) => x.slug === s)) setServicos([s])
  }, [completo])

  useEffect(() => {
    if (status === 'sucesso') sucessoRef.current?.focus()
  }, [status])

  function alternarServico(slug: string) {
    setServicos((atual) => (atual.includes(slug) ? atual.filter((s) => s !== slug) : [...atual, slug]))
  }

  function aoEscolherAnexo(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0] ?? null
    e.target.value = ''
    if (!arquivo) return
    const nomeMin = arquivo.name.toLowerCase()
    if (!ANEXO_EXTENSOES.some((ext) => nomeMin.endsWith(ext))) {
      setErros((er) => ({ ...er, anexo: 'Envie um arquivo PDF ou DWG.' }))
      return
    }
    if (arquivo.size > ANEXO_MAX_BYTES) {
      setErros((er) => ({ ...er, anexo: `O arquivo tem ${formatarMb(arquivo.size)}. O limite é 20 MB.` }))
      return
    }
    setErros((er) => ({ ...er, anexo: undefined }))
    setAnexo(arquivo)
  }

  function validar() {
    const novos: Partial<Record<Campo, string>> = {}
    if (nome.trim().length < 2) novos.nome = 'Informe seu nome.'
    if (telefone.replace(/\D/g, '').length < 10) novos.telefone = 'Informe um telefone com DDD.'
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) novos.email = 'Confira o e-mail informado.'
    if (!perfil) novos.perfil = 'Selecione o seu perfil.'
    if (area && !(Number(area) > 0)) novos.area = 'Informe a área em m², apenas números.'
    if (!consentimento) novos.consentimento = 'Precisamos do seu consentimento para responder ao pedido.'
    if (turnstileAtivo && !token) novos.turnstile = 'Confirme a verificação anti-spam.'
    if (erros.anexo) novos.anexo = erros.anexo
    return novos
  }

  async function aoEnviar(e: FormEvent) {
    e.preventDefault()
    setErroEnvio('')
    const novos = validar()
    setErros(novos)
    const primeiro = (Object.keys(novos) as Campo[])[0]
    if (primeiro) {
      const alvo = formRef.current?.querySelector<HTMLElement>(`[data-campo="${primeiro}"]`)
      alvo?.focus()
      return
    }

    setStatus('enviando')
    try {
      await enviarLead({
        nome: nome.trim(),
        telefone,
        email: email.trim() || undefined,
        empresa: empresa.trim() || undefined,
        perfil: perfil as PerfilLead,
        servicos,
        cidade: cidade.trim() || undefined,
        areaM2: area || undefined,
        mensagem: mensagem.trim() || undefined,
        origem: window.location.pathname,
        consentimento,
        turnstileToken: token || undefined,
        website,
        anexo,
      })
      track('lead_enviado', { perfil: perfil as string, origem: window.location.pathname, formulario: variante })
      setStatus('sucesso')
    } catch (err) {
      setStatus('ocioso')
      setErroEnvio(err instanceof ErroEnvio ? err.message : 'Não foi possível enviar agora. Tente novamente.')
      setToken('')
      setVersaoTurnstile((v) => v + 1)
    }
  }

  if (status === 'sucesso') {
    return (
      <div ref={sucessoRef} tabIndex={-1} role="status" className="flex flex-col items-start gap-4 py-6 outline-none">
        <CircleCheck aria-hidden="true" className="size-12 text-whats" />
        <h3 className="text-3xl text-marinho">Pedido recebido!</h3>
        <p className="text-grafite">
          Obrigado, {nome.split(' ')[0]}. Nossa equipe vai analisar as informações e retornar pelo WhatsApp ou e-mail.
          Se preferir adiantar a conversa, chame a gente agora:
        </p>
        <BotaoWhatsApp origem="formulario-sucesso">Adiantar pelo WhatsApp</BotaoWhatsApp>
      </div>
    )
  }

  const descErro = (c: Campo) => (erros[c] ? id(`${c}-erro`) : undefined)

  return (
    <form ref={formRef} onSubmit={aoEnviar} noValidate aria-describedby={id('obrigatorios')} className="space-y-5">
      <p id={id('obrigatorios')} className="text-sm text-grafite">
        Campos com <span className="text-red-700">*</span> são obrigatórios.
      </p>

      <div className={completo ? 'grid gap-5 sm:grid-cols-2' : 'grid gap-5'}>
        <div>
          <Rotulo htmlFor={id('nome')}>Nome</Rotulo>
          <input
            id={id('nome')}
            data-campo="nome"
            name="nome"
            autoComplete="name"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            aria-invalid={Boolean(erros.nome)}
            aria-describedby={descErro('nome')}
            className={estiloCampo(erros.nome)}
          />
          <MensagemErro id={id('nome-erro')} erro={erros.nome} />
        </div>
        {completo && (
          <div>
            <Rotulo htmlFor={id('empresa')} opcional>
              Empresa ou escritório
            </Rotulo>
            <input
              id={id('empresa')}
              name="empresa"
              autoComplete="organization"
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              className={estiloCampo()}
            />
          </div>
        )}
        <div>
          <Rotulo htmlFor={id('telefone')}>WhatsApp / telefone</Rotulo>
          <input
            id={id('telefone')}
            data-campo="telefone"
            name="telefone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="(11) 90000-0000"
            value={telefone}
            onChange={(e) => setTelefone(mascaraTelefone(e.target.value))}
            aria-invalid={Boolean(erros.telefone)}
            aria-describedby={descErro('telefone')}
            className={estiloCampo(erros.telefone)}
          />
          <MensagemErro id={id('telefone-erro')} erro={erros.telefone} />
        </div>
        {completo && (
          <div>
            <Rotulo htmlFor={id('email')} opcional>
              E-mail
            </Rotulo>
            <input
              id={id('email')}
              data-campo="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(erros.email)}
              aria-describedby={descErro('email')}
              className={estiloCampo(erros.email)}
            />
            <MensagemErro id={id('email-erro')} erro={erros.email} />
          </div>
        )}
      </div>

      <fieldset aria-describedby={descErro('perfil')}>
        <legend className="text-sm font-medium text-tinta">
          Você é<span aria-hidden="true" className="text-red-700"> *</span>
        </legend>
        <div className={`mt-2 grid gap-2 ${completo ? 'sm:grid-cols-3' : ''}`}>
          {PERFIS.map((p, i) => (
            <label
              key={p}
              className={`flex cursor-pointer items-center gap-3 rounded-[2px] border px-3.5 py-3 text-[0.95rem] transition-colors has-[:checked]:border-marinho has-[:checked]:bg-marinho-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-marinho ${
                erros.perfil ? 'border-red-700' : 'border-marinho/25 hover:border-marinho/50'
              }`}
            >
              <input
                type="radio"
                name={id('perfil')}
                value={p}
                data-campo={i === 0 ? 'perfil' : undefined}
                checked={perfil === p}
                onChange={() => setPerfil(p)}
                className="size-4 accent-marinho focus-visible:outline-none"
              />
              {PERFIL_LABEL[p]}
            </label>
          ))}
        </div>
        <MensagemErro id={id('perfil-erro')} erro={erros.perfil} />
      </fieldset>

      {completo && (
        <fieldset>
          <legend className="text-sm font-medium text-tinta">
            Serviços de interesse <span className="font-normal text-grafite">(marque quantos quiser)</span>
          </legend>
          <div className="mt-2 grid gap-x-5 gap-y-2.5 sm:grid-cols-2">
            {SERVICOS.map((s) => (
              <label key={s.slug} className="flex cursor-pointer items-center gap-3 text-[0.95rem]">
                <input
                  type="checkbox"
                  name="servicos"
                  value={s.slug}
                  checked={servicos.includes(s.slug)}
                  onChange={() => alternarServico(s.slug)}
                  className="size-4 accent-marinho"
                />
                {s.nomeCurto}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {completo && (
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Rotulo htmlFor={id('cidade')} opcional>
              Cidade da obra
            </Rotulo>
            <input
              id={id('cidade')}
              name="cidade"
              autoComplete="address-level2"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              className={estiloCampo()}
            />
          </div>
          <div>
            <Rotulo htmlFor={id('area')} opcional>
              Área aproximada (m²)
            </Rotulo>
            <input
              id={id('area')}
              data-campo="area"
              name="area"
              type="number"
              inputMode="decimal"
              min={1}
              step="any"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              aria-invalid={Boolean(erros.area)}
              aria-describedby={descErro('area')}
              className={estiloCampo(erros.area)}
            />
            <MensagemErro id={id('area-erro')} erro={erros.area} />
          </div>
        </div>
      )}

      <div>
        <Rotulo htmlFor={id('mensagem')} opcional>
          {completo ? 'Conte sobre a obra' : 'Mensagem'}
        </Rotulo>
        <textarea
          id={id('mensagem')}
          name="mensagem"
          rows={completo ? 5 : 3}
          value={mensagem}
          onChange={(e) => setMensagem(e.target.value)}
          placeholder={completo ? 'Tipo de edificação, número de pavimentos, prazo desejado…' : undefined}
          className={estiloCampo()}
        />
      </div>

      {completo && (
        <div>
          <span className="text-sm font-medium text-tinta">
            Projeto arquitetônico <span className="font-normal text-grafite">(opcional, PDF ou DWG até 20 MB)</span>
          </span>
          {anexo ? (
            <div className="mt-1.5 flex items-center justify-between gap-3 border border-marinho/25 bg-marinho-50 px-3.5 py-3 text-[0.95rem]">
              <span className="flex min-w-0 items-center gap-2">
                <Paperclip aria-hidden="true" className="size-4 shrink-0 text-marinho" />
                <span className="truncate">{anexo.name}</span>
                <span className="shrink-0 text-grafite">({formatarMb(anexo.size)})</span>
              </span>
              <button
                type="button"
                onClick={() => setAnexo(null)}
                className="inline-flex size-9 shrink-0 items-center justify-center text-marinho hover:bg-white"
              >
                <X aria-hidden="true" className="size-4" />
                <span className="sr-only">Remover arquivo {anexo.name}</span>
              </button>
            </div>
          ) : (
            <label
              htmlFor={id('anexo')}
              className={`mt-1.5 flex cursor-pointer items-center justify-center gap-2 border border-dashed px-4 py-5 text-[0.95rem] text-marinho transition-colors hover:bg-marinho-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-marinho ${
                erros.anexo ? 'border-red-700' : 'border-marinho/40'
              }`}
            >
              <Paperclip aria-hidden="true" className="size-4" />
              Anexar arquivo
              <input
                id={id('anexo')}
                data-campo="anexo"
                type="file"
                accept=".pdf,.dwg,application/pdf"
                onChange={aoEscolherAnexo}
                aria-invalid={Boolean(erros.anexo)}
                aria-describedby={descErro('anexo')}
                className="sr-only"
              />
            </label>
          )}
          <MensagemErro id={id('anexo-erro')} erro={erros.anexo} />
        </div>
      )}

      {/* Campo-isca anti-spam: invisível para pessoas */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={id('website')}>Não preencha este campo</label>
        <input id={id('website')} name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>

      <div>
        <label className="flex cursor-pointer items-start gap-3 text-[0.95rem] text-tinta">
          <input
            type="checkbox"
            data-campo="consentimento"
            checked={consentimento}
            onChange={(e) => setConsentimento(e.target.checked)}
            aria-invalid={Boolean(erros.consentimento)}
            aria-describedby={descErro('consentimento')}
            className="mt-1 size-4 shrink-0 accent-marinho"
          />
          <span>
            Autorizo a Albano Luz Engenharia a usar estes dados para responder ao meu pedido de orçamento, conforme a{' '}
            <Link to="/politica-de-privacidade" className="font-medium text-marinho underline underline-offset-2">
              política de privacidade
            </Link>
            .<span aria-hidden="true" className="text-red-700"> *</span>
          </span>
        </label>
        <MensagemErro id={id('consentimento-erro')} erro={erros.consentimento} />
      </div>

      {turnstileAtivo && (
        <div data-campo="turnstile" tabIndex={-1} className="outline-none">
          <Turnstile aoToken={setToken} versao={versaoTurnstile} />
          <MensagemErro id={id('turnstile-erro')} erro={erros.turnstile} />
        </div>
      )}

      {erroEnvio && (
        <p role="alert" className="border-l-4 border-red-700 bg-red-50 px-4 py-3 text-[0.95rem] text-red-900">
          {erroEnvio}
        </p>
      )}

      <button type="submit" disabled={status === 'enviando'} className={`${botao('primario', 'lg')} w-full sm:w-auto`}>
        {status === 'enviando' ? (
          <>
            <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
            Enviando…
          </>
        ) : (
          <>
            <Send aria-hidden="true" className="size-4" />
            {completo ? 'Enviar pedido de orçamento' : 'Quero um orçamento'}
          </>
        )}
      </button>
    </form>
  )
}

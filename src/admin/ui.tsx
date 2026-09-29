import {
  CircleCheck,
  ImageOff,
  Info,
  LoaderCircle,
  TriangleAlert,
  X,
  type LucideIcon,
} from 'lucide-react'
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { classeBotao, classeInput, classeLabel, type TamanhoBotao, type VarianteBotao } from './estilos'
import { cx } from './util'

// -----------------------------------------------------------------------------
// Botões
// -----------------------------------------------------------------------------

type BotaoProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: VarianteBotao
  tamanho?: TamanhoBotao
  carregando?: boolean
  icone?: LucideIcon
}

export function Botao({
  variante = 'primario',
  tamanho = 'md',
  carregando = false,
  icone: Icone,
  className,
  children,
  disabled,
  type = 'button',
  ...resto
}: BotaoProps) {
  return (
    <button
      type={type}
      className={classeBotao(variante, tamanho, className)}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      {...resto}
    >
      {carregando ? (
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        Icone && <Icone className="size-4" aria-hidden="true" />
      )}
      {children}
    </button>
  )
}

// -----------------------------------------------------------------------------
// Campos de formulário (label, dica e erro ligados por aria-describedby)
// -----------------------------------------------------------------------------

type BaseCampo = {
  rotulo: ReactNode
  dica?: ReactNode
  erro?: string | null
  obrigatorio?: boolean
  className?: string
}

function useIdsCampo(id: string | undefined, dica: ReactNode, erro: string | null | undefined) {
  const gerado = useId()
  const idCampo = id ?? gerado
  const descricao = [dica ? `${idCampo}-dica` : null, erro ? `${idCampo}-erro` : null].filter(Boolean).join(' ')
  return { idCampo, descricao: descricao || undefined }
}

function Rotulo({ htmlFor, obrigatorio, children }: { htmlFor: string; obrigatorio?: boolean; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className={classeLabel}>
      {children}
      {obrigatorio && (
        <span className="text-red-800">
          <span aria-hidden="true"> *</span>
          <span className="sr-only"> (obrigatório)</span>
        </span>
      )}
    </label>
  )
}

function DicaErro({ idCampo, dica, erro }: { idCampo: string; dica?: ReactNode; erro?: string | null }) {
  return (
    <>
      {dica && (
        <p id={`${idCampo}-dica`} className="mt-1 text-xs text-grafite">
          {dica}
        </p>
      )}
      {erro && (
        <p id={`${idCampo}-erro`} className="mt-1 text-sm font-medium text-red-800">
          {erro}
        </p>
      )}
    </>
  )
}

export function CampoTexto({
  rotulo,
  dica,
  erro,
  obrigatorio,
  className,
  id,
  ...input
}: BaseCampo & Omit<InputHTMLAttributes<HTMLInputElement>, 'className'>) {
  const { idCampo, descricao } = useIdsCampo(id, dica, erro)
  return (
    <div className={className}>
      <Rotulo htmlFor={idCampo} obrigatorio={obrigatorio}>
        {rotulo}
      </Rotulo>
      <input
        id={idCampo}
        required={obrigatorio}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descricao}
        className={classeInput}
        {...input}
      />
      <DicaErro idCampo={idCampo} dica={dica} erro={erro} />
    </div>
  )
}

export function CampoAreaTexto({
  rotulo,
  dica,
  erro,
  obrigatorio,
  className,
  id,
  rows = 4,
  ...textarea
}: BaseCampo & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'>) {
  const { idCampo, descricao } = useIdsCampo(id, dica, erro)
  return (
    <div className={className}>
      <Rotulo htmlFor={idCampo} obrigatorio={obrigatorio}>
        {rotulo}
      </Rotulo>
      <textarea
        id={idCampo}
        rows={rows}
        required={obrigatorio}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descricao}
        className={cx(classeInput, 'resize-y')}
        {...textarea}
      />
      <DicaErro idCampo={idCampo} dica={dica} erro={erro} />
    </div>
  )
}

export function CampoSelecao({
  rotulo,
  dica,
  erro,
  obrigatorio,
  className,
  id,
  children,
  ...select
}: BaseCampo & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'>) {
  const { idCampo, descricao } = useIdsCampo(id, dica, erro)
  return (
    <div className={className}>
      <Rotulo htmlFor={idCampo} obrigatorio={obrigatorio}>
        {rotulo}
      </Rotulo>
      <select
        id={idCampo}
        required={obrigatorio}
        aria-invalid={erro ? true : undefined}
        aria-describedby={descricao}
        className={classeInput}
        {...select}
      >
        {children}
      </select>
      <DicaErro idCampo={idCampo} dica={dica} erro={erro} />
    </div>
  )
}

export function CaixaMarcacao({
  rotulo,
  dica,
  className,
  id,
  ...input
}: { rotulo: ReactNode; dica?: ReactNode; className?: string } & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'className'
>) {
  const gerado = useId()
  const idCampo = id ?? gerado
  return (
    <div className={cx('flex items-start gap-3', className)}>
      <input
        id={idCampo}
        type="checkbox"
        aria-describedby={dica ? `${idCampo}-dica` : undefined}
        className="mt-0.5 size-5 shrink-0 cursor-pointer rounded border-concreto-escuro accent-marinho"
        {...input}
      />
      <div>
        <label htmlFor={idCampo} className="cursor-pointer text-sm font-medium text-tinta">
          {rotulo}
        </label>
        {dica && (
          <p id={`${idCampo}-dica`} className="text-xs text-grafite">
            {dica}
          </p>
        )}
      </div>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Estados e mensagens
// -----------------------------------------------------------------------------

type TipoAviso = 'info' | 'sucesso' | 'erro' | 'alerta'

const ESTILO_AVISO: Record<TipoAviso, { classe: string; icone: LucideIcon }> = {
  info: { classe: 'border-marinho-200 bg-marinho-50 text-marinho-900', icone: Info },
  sucesso: { classe: 'border-emerald-200 bg-emerald-50 text-emerald-900', icone: CircleCheck },
  erro: { classe: 'border-red-200 bg-red-50 text-red-900', icone: TriangleAlert },
  alerta: { classe: 'border-amber-300 bg-amber-50 text-amber-950', icone: TriangleAlert },
}

export function Aviso({
  tipo = 'info',
  titulo,
  children,
  acao,
  className,
}: {
  tipo?: TipoAviso
  titulo?: ReactNode
  children?: ReactNode
  acao?: ReactNode
  className?: string
}) {
  const { classe, icone: Icone } = ESTILO_AVISO[tipo]
  return (
    <div
      role={tipo === 'erro' ? 'alert' : 'status'}
      className={cx('flex gap-3 rounded-md border p-3 text-sm', classe, className)}
    >
      <Icone className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {titulo && <p className="font-semibold">{titulo}</p>}
        {children && <div className={titulo ? 'mt-1' : undefined}>{children}</div>}
        {acao && <div className="mt-2">{acao}</div>}
      </div>
    </div>
  )
}

export function Carregando({ texto = 'Carregando…', className }: { texto?: string; className?: string }) {
  return (
    <div role="status" className={cx('flex items-center gap-3 py-8 text-grafite', className)}>
      <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
      <span>{texto}</span>
    </div>
  )
}

export function Vazio({
  icone: Icone,
  titulo,
  children,
  acao,
}: {
  icone: LucideIcon
  titulo: string
  children?: ReactNode
  acao?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-concreto-escuro bg-white px-6 py-12 text-center">
      <Icone className="size-10 text-marinho-300" aria-hidden="true" />
      <p className="mt-3 font-serif text-2xl font-semibold text-marinho">{titulo}</p>
      {children && <div className="mt-1 max-w-md text-sm text-grafite">{children}</div>}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  )
}

// -----------------------------------------------------------------------------
// Estrutura
// -----------------------------------------------------------------------------

export function Cartao({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('rounded-lg border border-concreto-escuro/70 bg-white shadow-sm', className)}>{children}</div>
}

export function CabecalhoAba({
  id,
  titulo,
  descricao,
  acoes,
}: {
  id?: string
  titulo: string
  descricao?: ReactNode
  acoes?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 id={id} className="text-4xl text-marinho">
          {titulo}
        </h1>
        {descricao && <p className="mt-1 text-sm text-grafite">{descricao}</p>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </div>
  )
}

type TipoSelo = 'neutro' | 'marinho' | 'sucesso' | 'alerta' | 'info'

const ESTILO_SELO: Record<TipoSelo, string> = {
  neutro: 'bg-concreto-claro text-grafite ring-concreto-escuro',
  marinho: 'bg-marinho text-white ring-marinho',
  sucesso: 'bg-emerald-50 text-emerald-900 ring-emerald-200',
  alerta: 'bg-amber-50 text-amber-950 ring-amber-300',
  info: 'bg-sky-50 text-sky-900 ring-sky-200',
}

export function Selo({ tipo = 'neutro', children }: { tipo?: TipoSelo; children: ReactNode }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset',
        ESTILO_SELO[tipo],
      )}
    >
      {children}
    </span>
  )
}

/**
 * Miniatura de imagem. Aceita URL pública do storage ou caminho local do site
 * ("/fotos/x.webp"); se não houver imagem ou ela não carregar, mostra um aviso.
 */
export function Miniatura({
  url,
  alt,
  className,
}: {
  url: string | null | undefined
  alt: string
  className?: string
}) {
  const [urlComErro, setUrlComErro] = useState<string | null>(null)
  if (!url || urlComErro === url) {
    const rotulo = url ? `Imagem indisponível${alt ? `: ${alt}` : ''}` : 'Sem imagem'
    return (
      <div
        className={cx('flex items-center justify-center bg-concreto-claro text-grafite/60', className)}
        role="img"
        aria-label={rotulo}
        title={rotulo}
      >
        <ImageOff className="size-5" aria-hidden="true" />
      </div>
    )
  }
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setUrlComErro(url)}
      className={cx('bg-concreto-claro object-cover', className)}
    />
  )
}

// -----------------------------------------------------------------------------
// Diálogo (elemento <dialog> nativo: foco preso, Esc fecha, fundo inerte)
// -----------------------------------------------------------------------------

/**
 * Quem fecha é sempre o pai (aberto = false). Esc, o X e o clique no fundo só
 * chamam onFechar, que pode pedir confirmação e manter o diálogo aberto.
 */
export function Dialogo({
  aberto,
  onFechar,
  titulo,
  subtitulo,
  lateral = false,
  children,
  rodape,
  fecharNoFundo = true,
}: {
  aberto: boolean
  onFechar: () => void
  /** Clique fora fecha? Desligar em formulários para não perder o que foi digitado. */
  fecharNoFundo?: boolean
  titulo: ReactNode
  subtitulo?: ReactNode
  /** Painel encostado à direita (tela cheia no celular). */
  lateral?: boolean
  children: ReactNode
  rodape?: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const idTitulo = useId()
  // Incrementado quando o navegador fecha o diálogo por conta própria: faz o
  // efeito abaixo rodar de novo e reabrir se o pai ainda quiser aberto.
  const [reabrir, setReabrir] = useState(0)

  useEffect(() => {
    const dialogo = ref.current
    if (!dialogo) return
    if (aberto && !dialogo.open) dialogo.showModal()
    if (!aberto && dialogo.open) dialogo.close()
  }, [aberto, reabrir])

  return (
    <dialog
      ref={ref}
      aria-labelledby={idTitulo}
      onCancel={(e) => {
        // Esc: impede o fechamento nativo e deixa o pai decidir.
        if (e.cancelable) {
          e.preventDefault()
          onFechar()
        }
        // Não cancelável (Esc repetido sem interação do usuário): o navegador
        // fecha mesmo assim, e o onClose abaixo trata.
      }}
      onClose={(e) => {
        // Fechado pelo efeito (aberto = false) ou já reaberto: nada a fazer.
        if (!aberto || e.currentTarget.open) return
        onFechar()
        setReabrir((n) => n + 1)
      }}
      onClick={(e) => {
        if (fecharNoFundo && e.target === e.currentTarget) onFechar()
      }}
      className={cx(
        'bg-white p-0 text-tinta shadow-2xl backdrop:bg-tinta/60',
        lateral
          ? 'my-0 mr-0 ml-auto h-dvh max-h-dvh w-full max-w-2xl'
          : 'm-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl rounded-lg',
      )}
    >
      {aberto && (
        <div className={cx('flex flex-col', lateral ? 'h-full' : 'max-h-[calc(100dvh-2rem)]')}>
          <div className="flex items-start gap-3 border-b border-concreto-escuro/70 px-5 py-4">
            <div className="min-w-0 flex-1">
              <h2 id={idTitulo} className="text-2xl text-marinho">
                {titulo}
              </h2>
              {subtitulo && <p className="mt-0.5 text-sm text-grafite">{subtitulo}</p>}
            </div>
            <button
              type="button"
              onClick={onFechar}
              className={classeBotao('fantasma', 'sm', 'px-2')}
              aria-label="Fechar"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
          {rodape && (
            <div className="flex flex-wrap justify-end gap-2 border-t border-concreto-escuro/70 bg-concreto-claro/60 px-5 py-3">
              {rodape}
            </div>
          )}
        </div>
      )}
    </dialog>
  )
}

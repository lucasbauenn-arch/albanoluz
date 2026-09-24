/**
 * Painel administrativo da Albano Luz (rota /admin/*, só no cliente).
 *
 * Abas por query string: ?aba=leads | obras | depoimentos (padrão: leads).
 */
import type { Session } from '@supabase/supabase-js'
import { Building, ExternalLink, Inbox, LogOut, Quote, type LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  ErroAcesso,
  Login,
  NaoAutorizado,
  NaoConfigurado,
  NovaSenha,
  TelaCarregando,
} from './Acesso'
import DepoimentosAba from './depoimentos/DepoimentosAba'
import { classeBotao } from './estilos'
import LeadsAba from './leads/LeadsAba'
import ObrasAba from './obras/ObrasAba'
import { chegouPorLinkDeRecuperacao, erroLinkEmail, sb, supabase } from './supabase'
import { Aviso } from './ui'
import { cx, mensagemErro } from './util'

export default function AdminApp() {
  useEffect(() => {
    const anterior = document.title
    document.title = 'Painel | Albano Luz'
    return () => {
      document.title = anterior
    }
  }, [])

  return (
    <>
      <meta name="robots" content="noindex, nofollow" />
      {supabase ? <ComSessao /> : <NaoConfigurado />}
    </>
  )
}

// -----------------------------------------------------------------------------
// Sessão e permissão
// -----------------------------------------------------------------------------

type Acesso =
  | { estado: 'verificando' }
  | { estado: 'ok' }
  | { estado: 'negado' }
  | { estado: 'erro'; mensagem: string }

function useAcessoAdmin(userId: string | null) {
  const [resultado, setResultado] = useState<{ userId: string; tentativa: number; acesso: Acesso } | null>(null)
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    if (!userId) return
    let ativo = true
    sb()
      .rpc('is_admin')
      .then(({ data, error }) => {
        if (!ativo) return
        const acesso: Acesso = error
          ? { estado: 'erro', mensagem: mensagemErro(error, 'Não foi possível verificar suas permissões.') }
          : data === true
            ? { estado: 'ok' }
            : { estado: 'negado' }
        setResultado({ userId, tentativa, acesso })
      })
    return () => {
      ativo = false
    }
  }, [userId, tentativa])

  const acesso: Acesso =
    resultado && resultado.userId === userId && resultado.tentativa === tentativa
      ? resultado.acesso
      : { estado: 'verificando' }

  const tentarDeNovo = useCallback(() => setTentativa((t) => t + 1), [])
  return { acesso, tentarDeNovo }
}

function ComSessao() {
  const [sessao, setSessao] = useState<Session | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [recuperacao, setRecuperacao] = useState(chegouPorLinkDeRecuperacao)
  const [senhaAlterada, setSenhaAlterada] = useState(false)

  useEffect(() => {
    // Não chamar outros métodos do Supabase dentro deste callback (risco de deadlock).
    const { data } = sb().auth.onAuthStateChange((evento, novaSessao) => {
      if (evento === 'PASSWORD_RECOVERY') setRecuperacao(true)
      if (evento === 'SIGNED_OUT') setRecuperacao(false)
      setSessao(novaSessao)
      setCarregando(false)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const { acesso, tentarDeNovo } = useAcessoAdmin(sessao?.user.id ?? null)

  const sair = useCallback(async () => {
    const { error } = await sb().auth.signOut({ scope: 'local' })
    if (error) console.warn('Falha ao sair:', error.message)
  }, [])

  if (carregando) return <TelaCarregando texto="Carregando o painel…" />
  if (!sessao) return <Login avisoInicial={erroLinkEmail} />

  const email = sessao.user.email

  if (recuperacao) {
    return (
      <NovaSenha
        email={email}
        onSair={sair}
        onConcluir={() => {
          setRecuperacao(false)
          setSenhaAlterada(true)
        }}
      />
    )
  }

  if (acesso.estado === 'verificando') return <TelaCarregando texto="Verificando permissões…" />
  if (acesso.estado === 'erro') return <ErroAcesso mensagem={acesso.mensagem} onTentar={tentarDeNovo} onSair={sair} />
  if (acesso.estado === 'negado') return <NaoAutorizado email={email} onSair={sair} />

  return (
    <Painel
      email={email}
      onSair={sair}
      aviso={senhaAlterada ? 'Nova senha salva com sucesso.' : null}
      onFecharAviso={() => setSenhaAlterada(false)}
    />
  )
}

// -----------------------------------------------------------------------------
// Layout do painel
// -----------------------------------------------------------------------------

const ABAS = [
  { id: 'leads', rotulo: 'Leads', icone: Inbox },
  { id: 'obras', rotulo: 'Obras', icone: Building },
  { id: 'depoimentos', rotulo: 'Depoimentos', icone: Quote },
] as const satisfies readonly { id: string; rotulo: string; icone: LucideIcon }[]

type IdAba = (typeof ABAS)[number]['id']

function abaValida(valor: string | null): valor is IdAba {
  return ABAS.some((a) => a.id === valor)
}

function Painel({
  email,
  onSair,
  aviso,
  onFecharAviso,
}: {
  email?: string
  onSair: () => void
  aviso: string | null
  onFecharAviso: () => void
}) {
  const [params] = useSearchParams()
  const parametro = params.get('aba')
  const aba: IdAba = abaValida(parametro) ? parametro : 'leads'
  const [saindo, setSaindo] = useState(false)

  return (
    <div className="min-h-dvh bg-concreto-claro text-tinta">
      <header className="tema-escuro bg-marinho">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <img src="/favicon.svg" alt="" width={36} height={36} className="size-9 shrink-0" />
          <p className="font-serif text-xl leading-tight font-semibold sm:text-2xl">Painel Albano Luz</p>
          <div className="ml-auto flex min-w-0 items-center gap-1 sm:gap-3">
            {email && (
              <span className="hidden max-w-64 truncate text-sm text-marinho-100 md:block" title={email}>
                {email}
              </span>
            )}
            <a
              href="/"
              target="_blank"
              rel="noopener"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-2 text-sm text-marinho-100 hover:bg-white/10 hover:text-white sm:px-3"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">Ver site</span>
              <span className="sr-only sm:hidden">Ver site</span>
              <span className="sr-only"> (abre em nova aba)</span>
            </a>
            <button
              type="button"
              onClick={() => {
                setSaindo(true)
                onSair()
              }}
              disabled={saindo}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-white/30 px-3 text-sm font-medium hover:bg-white/10 disabled:opacity-60"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Sair
            </button>
          </div>
        </div>
      </header>

      <nav aria-label="Seções do painel" className="border-b border-concreto-escuro bg-white">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2 sm:px-4">
          {ABAS.map(({ id, rotulo, icone: Icone }) => {
            const ativa = id === aba
            return (
              <Link
                key={id}
                to={{ search: `?aba=${id}` }}
                aria-current={ativa ? 'page' : undefined}
                className={cx(
                  'inline-flex min-h-12 items-center gap-2 border-b-2 px-3 text-sm font-medium whitespace-nowrap sm:px-4',
                  ativa
                    ? 'border-marinho text-marinho'
                    : 'border-transparent text-grafite hover:border-concreto-escuro hover:text-marinho',
                )}
              >
                <Icone className="size-4" aria-hidden="true" />
                {rotulo}
              </Link>
            )
          })}
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {aviso && (
          <Aviso
            tipo="sucesso"
            className="mb-5"
            acao={
              <button type="button" onClick={onFecharAviso} className={classeBotao('fantasma', 'sm')}>
                Fechar aviso
              </button>
            }
          >
            {aviso}
          </Aviso>
        )}
        {aba === 'leads' && <LeadsAba />}
        {aba === 'obras' && <ObrasAba />}
        {aba === 'depoimentos' && <DepoimentosAba />}
      </main>
    </div>
  )
}

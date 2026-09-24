import { Eye, EyeOff, KeyRound, LogOut, ShieldAlert } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { sb } from './supabase'
import { Aviso, Botao, CampoTexto, Carregando } from './ui'
import { mensagemErro } from './util'

const SENHA_MINIMA = 8

/** Moldura das telas de acesso (fundo de prancha técnica + cartão branco). */
export function TelaAcesso({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="grade-tecnica flex min-h-dvh items-center justify-center px-4 py-10">
      <main className="w-full max-w-md">
        <div className="tema-escuro mb-6 flex items-center justify-center gap-3">
          <img src="/favicon.svg" alt="" width={48} height={48} className="size-12" />
          <div>
            <p className="font-serif text-3xl leading-none font-semibold">Albano Luz</p>
            <p className="mt-1 text-sm text-marinho-100">Painel administrativo</p>
          </div>
        </div>
        <div className="rounded-lg bg-white p-6 shadow-2xl sm:p-8">
          <h1 className="text-3xl text-marinho">{titulo}</h1>
          <div className="mt-5">{children}</div>
        </div>
      </main>
    </div>
  )
}

export function TelaCarregando({ texto }: { texto?: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-concreto-claro px-4">
      <Carregando texto={texto} />
    </div>
  )
}

// -----------------------------------------------------------------------------
// Supabase não configurado
// -----------------------------------------------------------------------------

export function NaoConfigurado() {
  return (
    <TelaAcesso titulo="Configuração pendente">
      <p className="text-sm text-grafite">
        O painel precisa das credenciais do Supabase para funcionar. Defina estas variáveis de ambiente no arquivo{' '}
        <code className="rounded bg-concreto-claro px-1 py-0.5 text-tinta">.env.local</code> (desenvolvimento) ou nas
        configurações da hospedagem, e gere o site novamente:
      </p>
      <pre className="mt-4 overflow-x-auto rounded-md bg-tinta p-4 text-xs leading-relaxed text-white">
        <code>
          {'VITE_SUPABASE_URL=https://<projeto>.supabase.co\nVITE_SUPABASE_ANON_KEY=<chave anon / publishable>'}
        </code>
      </pre>
      <p className="mt-4 text-sm text-grafite">
        Os valores ficam em <strong>Supabase → Project Settings → API</strong>. O passo a passo completo (banco,
        storage, primeiro administrador e função de envio de leads) está em{' '}
        <code className="rounded bg-concreto-claro px-1 py-0.5 text-tinta">supabase/README.md</code>.
      </p>
    </TelaAcesso>
  )
}

// -----------------------------------------------------------------------------
// Login e "esqueci minha senha"
// -----------------------------------------------------------------------------

export function Login({ avisoInicial }: { avisoInicial?: string | null }) {
  const [modo, setModo] = useState<'entrar' | 'esqueci'>(avisoInicial ? 'esqueci' : 'entrar')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)

  function trocarModo(novo: 'entrar' | 'esqueci') {
    setModo(novo)
    setErro(null)
    setSucesso(null)
  }

  async function entrar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    try {
      const { error } = await sb().auth.signInWithPassword({ email: email.trim(), password: senha })
      if (error) setErro(mensagemErro(error, 'Não foi possível entrar.'))
      // Em caso de sucesso, o onAuthStateChange do AdminApp troca a tela.
    } catch (falha) {
      setErro(mensagemErro(falha, 'Não foi possível entrar.'))
    } finally {
      setEnviando(false)
    }
  }

  async function recuperar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro(null)
    setSucesso(null)
    setEnviando(true)
    try {
      const { error } = await sb().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/admin`,
      })
      if (error) {
        setErro(mensagemErro(error, 'Não foi possível enviar o e-mail.'))
      } else {
        setSucesso(
          'Se este e-mail tiver acesso ao painel, você receberá em instantes um link para criar uma nova senha. Confira também a caixa de spam.',
        )
      }
    } catch (falha) {
      setErro(mensagemErro(falha, 'Não foi possível enviar o e-mail.'))
    } finally {
      setEnviando(false)
    }
  }

  if (modo === 'esqueci') {
    return (
      <TelaAcesso titulo="Recuperar senha">
        {avisoInicial && !sucesso && (
          <Aviso tipo="alerta" className="mb-4">
            {avisoInicial}
          </Aviso>
        )}
        <form onSubmit={recuperar} className="space-y-4">
          <p className="text-sm text-grafite">
            Informe o e-mail usado no painel. Enviaremos um link para você criar uma nova senha.
          </p>
          <CampoTexto
            rotulo="E-mail"
            type="email"
            autoComplete="email"
            inputMode="email"
            obrigatorio
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {erro && <Aviso tipo="erro">{erro}</Aviso>}
          {sucesso && <Aviso tipo="sucesso">{sucesso}</Aviso>}
          <Botao type="submit" carregando={enviando} className="w-full">
            Enviar link de redefinição
          </Botao>
          <button
            type="button"
            onClick={() => trocarModo('entrar')}
            className="block w-full text-center text-sm font-medium text-marinho-600 underline underline-offset-4 hover:text-marinho"
          >
            Voltar para o login
          </button>
        </form>
      </TelaAcesso>
    )
  }

  return (
    <TelaAcesso titulo="Entrar">
      <form onSubmit={entrar} className="space-y-4">
        <CampoTexto
          rotulo="E-mail"
          type="email"
          autoComplete="username"
          inputMode="email"
          obrigatorio
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div>
          <CampoTexto
            rotulo="Senha"
            type={mostrarSenha ? 'text' : 'password'}
            autoComplete="current-password"
            obrigatorio
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setMostrarSenha((v) => !v)}
            aria-pressed={mostrarSenha}
            className="mt-2 inline-flex items-center gap-1.5 text-sm text-marinho-600 hover:text-marinho"
          >
            {mostrarSenha ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
            Mostrar senha
          </button>
        </div>
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <Botao type="submit" carregando={enviando} className="w-full">
          Entrar
        </Botao>
        <button
          type="button"
          onClick={() => trocarModo('esqueci')}
          className="block w-full text-center text-sm font-medium text-marinho-600 underline underline-offset-4 hover:text-marinho"
        >
          Esqueci minha senha
        </button>
      </form>
    </TelaAcesso>
  )
}

// -----------------------------------------------------------------------------
// Nova senha (após o link de recuperação)
// -----------------------------------------------------------------------------

export function NovaSenha({ email, onConcluir, onSair }: { email?: string; onConcluir: () => void; onSair: () => void }) {
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro(null)
    if (senha.length < SENHA_MINIMA) {
      setErro(`A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`)
      return
    }
    if (senha !== confirmacao) {
      setErro('As senhas digitadas não são iguais.')
      return
    }
    setEnviando(true)
    try {
      const { error } = await sb().auth.updateUser({ password: senha })
      if (error) setErro(mensagemErro(error, 'Não foi possível salvar a nova senha.'))
      else onConcluir()
    } catch (falha) {
      setErro(mensagemErro(falha, 'Não foi possível salvar a nova senha.'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <TelaAcesso titulo="Criar nova senha">
      <form onSubmit={salvar} className="space-y-4">
        {email && (
          <p className="text-sm text-grafite">
            Conta: <strong className="text-tinta">{email}</strong>
          </p>
        )}
        {/* Campo oculto ajuda gerenciadores de senha a associar a conta. */}
        <input type="email" autoComplete="username" value={email ?? ''} readOnly hidden />
        <CampoTexto
          rotulo="Nova senha"
          type="password"
          autoComplete="new-password"
          obrigatorio
          minLength={SENHA_MINIMA}
          dica={`Mínimo de ${SENHA_MINIMA} caracteres.`}
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        <CampoTexto
          rotulo="Confirme a nova senha"
          type="password"
          autoComplete="new-password"
          obrigatorio
          minLength={SENHA_MINIMA}
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
        />
        {erro && <Aviso tipo="erro">{erro}</Aviso>}
        <Botao type="submit" icone={KeyRound} carregando={enviando} className="w-full">
          Salvar nova senha
        </Botao>
        <Botao variante="fantasma" icone={LogOut} onClick={onSair} className="w-full">
          Sair
        </Botao>
      </form>
    </TelaAcesso>
  )
}

// -----------------------------------------------------------------------------
// Logado, mas sem permissão
// -----------------------------------------------------------------------------

export function NaoAutorizado({ email, onSair }: { email?: string; onSair: () => void }) {
  return (
    <TelaAcesso titulo="Acesso não autorizado">
      <div className="flex gap-3">
        <ShieldAlert className="size-6 shrink-0 text-red-800" aria-hidden="true" />
        <p className="text-sm text-grafite">
          A conta <strong className="text-tinta">{email ?? 'atual'}</strong> não tem permissão para acessar o painel.
          Se você faz parte da equipe da Albano Luz, peça ao administrador para liberar seu acesso.
        </p>
      </div>
      <Botao icone={LogOut} onClick={onSair} className="mt-6 w-full">
        Sair
      </Botao>
    </TelaAcesso>
  )
}

export function ErroAcesso({ mensagem, onTentar, onSair }: { mensagem: string; onTentar: () => void; onSair: () => void }) {
  return (
    <TelaAcesso titulo="Não foi possível verificar o acesso">
      <Aviso tipo="erro">{mensagem}</Aviso>
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <Botao onClick={onTentar}>Tentar de novo</Botao>
        <Botao variante="secundario" icone={LogOut} onClick={onSair}>
          Sair
        </Botao>
      </div>
    </TelaAcesso>
  )
}

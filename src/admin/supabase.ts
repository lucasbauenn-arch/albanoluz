import { createClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigurado } from '../lib/env'
import type { Database } from './database'

export const BUCKET_OBRAS = 'obras'
export const BUCKET_ANEXOS = 'anexos'

// Chave própria: não mistura a sessão do painel com um eventual cliente
// anônimo do site público.
const CHAVE_SESSAO = 'albano-luz-painel-auth'

/**
 * Lido ANTES de criar o cliente, que consome e limpa o hash da URL.
 * Serve de reforço ao evento PASSWORD_RECOVERY, que pode disparar antes de o
 * painel se inscrever em onAuthStateChange.
 */
const hashInicial = typeof window === 'undefined' ? '' : window.location.hash
const paramsHash = new URLSearchParams(hashInicial.replace(/^#/, ''))

export const chegouPorLinkDeRecuperacao = paramsHash.get('type') === 'recovery'

/** Erro vindo de um link de e-mail expirado ou inválido (ex.: otp_expired). */
export const erroLinkEmail: string | null =
  paramsHash.get('error_code') === 'otp_expired'
    ? 'O link de redefinição expirou ou já foi usado. Solicite um novo abaixo.'
    : paramsHash.get('error')
      ? 'O link recebido por e-mail é inválido. Solicite um novo abaixo.'
      : null

function criarCliente() {
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: CHAVE_SESSAO,
    },
  })
}

export type ClienteSupabase = ReturnType<typeof criarCliente>

export const supabase: ClienteSupabase | null = supabaseConfigurado ? criarCliente() : null

/** Cliente garantido; só chamar dentro do painel já configurado. */
export function sb(): ClienteSupabase {
  if (!supabase) throw new Error('Supabase não configurado.')
  return supabase
}

/**
 * Apaga a sessão do painel guardada no navegador (as chaves que o auth-js usa).
 * Para quando o logout no servidor falha: o auth-js devolve o erro sem limpar.
 */
export function limparSessaoLocal(): void {
  for (const chave of [CHAVE_SESSAO, `${CHAVE_SESSAO}-code-verifier`, `${CHAVE_SESSAO}-user`]) {
    try {
      window.localStorage.removeItem(chave)
    } catch {
      // Armazenamento bloqueado: a sessão fica só na memória, e recarregar a descarta.
    }
  }
}

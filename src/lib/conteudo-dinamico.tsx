import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { OBRAS_LOCAIS } from '../data/obras'
import type { Depoimento, Obra } from '../types'
import { supabaseConfigurado } from './env'
import { buscarDepoimentos, buscarObras } from './remoto'

export interface DadosIniciais {
  obras: Obra[]
  depoimentos: Depoimento[]
  /** "local" = obras ilustrativas de src/data/obras.ts; "supabase" = painel admin. */
  fonte: 'local' | 'supabase'
}

declare global {
  interface Window {
    __AL_DADOS__?: DadosIniciais
  }
}

export const DADOS_LOCAIS: DadosIniciais = { obras: OBRAS_LOCAIS, depoimentos: [], fonte: 'local' }

interface Estado extends DadosIniciais {
  /** true depois que a versão mais recente do banco foi carregada (ou não há banco). */
  atualizado: boolean
}

const Ctx = createContext<Estado>({ ...DADOS_LOCAIS, atualizado: true })

/**
 * Obras e depoimentos. A primeira renderização usa os mesmos dados da
 * pré-renderização (evita divergência na hidratação); em seguida busca a
 * versão atual no Supabase, para mostrar obras cadastradas após o último deploy.
 */
export function ConteudoProvider({ inicial, children }: { inicial: DadosIniciais; children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>({ ...inicial, atualizado: !supabaseConfigurado })

  useEffect(() => {
    // O painel /admin tem suas próprias consultas autenticadas.
    if (!supabaseConfigurado || window.location.pathname.startsWith('/admin')) return
    let ativo = true
    Promise.all([buscarObras(), buscarDepoimentos()])
      .then(([obras, depoimentos]) => {
        if (ativo) setEstado({ obras, depoimentos, fonte: 'supabase', atualizado: true })
      })
      .catch((err) => {
        console.warn('Não foi possível atualizar obras do Supabase:', err)
        if (ativo) setEstado((e) => ({ ...e, atualizado: true }))
      })
    return () => {
      ativo = false
    }
  }, [])

  return <Ctx.Provider value={estado}>{children}</Ctx.Provider>
}

export const useConteudo = () => useContext(Ctx)

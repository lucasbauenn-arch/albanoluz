import { Menu, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { SITE } from '../../config/site'
import { BotaoWhatsApp } from '../BotaoWhatsApp'
import { Logo } from '../ui/Logo'
import { botao } from '../ui/botao'

export const MENU = [
  { nome: 'Sobre', path: '/sobre' },
  { nome: 'Serviços', path: '/servicos' },
  { nome: 'Portfólio', path: '/portfolio' },
  { nome: 'Por que contratar', path: '/por-que-contratar' },
  { nome: 'Contato', path: '/contato' },
]

export function Cabecalho() {
  const { pathname } = useLocation()
  // Guarda a página em que o menu foi aberto: ao navegar, ele fecha sozinho.
  const [abertoEm, setAbertoEm] = useState<string | null>(null)
  const aberto = abertoEm === pathname
  const setAberto = (v: boolean | ((a: boolean) => boolean)) =>
    setAbertoEm((atual) => ((typeof v === 'function' ? v(atual === pathname) : v) ? pathname : null))
  const botaoRef = useRef<HTMLButtonElement>(null)
  const painelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aberto) return
    const html = document.documentElement
    html.style.overflow = 'hidden'
    painelRef.current?.querySelector<HTMLElement>('a')?.focus()
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setAbertoEm(null)
        botaoRef.current?.focus()
      }
    }
    window.addEventListener('keydown', aoTeclar)
    return () => {
      html.style.overflow = ''
      window.removeEventListener('keydown', aoTeclar)
    }
  }, [aberto])

  return (
    <header className="sticky top-0 z-50 border-b border-marinho/10 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="container-site flex h-16 items-center justify-between gap-6 lg:h-20">
        <Link to="/" aria-label={`${SITE.nome}, página inicial`} className="shrink-0">
          <Logo />
        </Link>

        <nav aria-label="Menu principal" className="hidden lg:block">
          <ul className="flex items-center gap-7">
            {MENU.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `relative py-2 text-[0.95rem] font-medium transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-[2px] after:origin-left after:bg-marinho after:transition-transform ${
                      isActive
                        ? 'text-marinho after:scale-x-100'
                        : 'text-grafite after:scale-x-0 hover:text-marinho hover:after:scale-x-100'
                    }`
                  }
                >
                  {item.nome}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/contato" className={`${botao('primario', 'sm')} max-sm:hidden lg:px-5 lg:py-2.5`}>
            Solicitar orçamento
          </Link>
          <button
            ref={botaoRef}
            type="button"
            className="-mr-2 inline-flex size-11 items-center justify-center text-marinho lg:hidden"
            aria-expanded={aberto}
            aria-controls="menu-movel"
            onClick={() => setAberto((a) => !a)}
          >
            {aberto ? <X aria-hidden="true" className="size-6" /> : <Menu aria-hidden="true" className="size-6" />}
            <span className="sr-only">{aberto ? 'Fechar menu' : 'Abrir menu'}</span>
          </button>
        </div>
      </div>

      <div
        id="menu-movel"
        ref={painelRef}
        hidden={!aberto}
        className="grade-tecnica tema-escuro fixed inset-x-0 top-16 bottom-0 overflow-y-auto lg:hidden"
      >
        <nav aria-label="Menu principal" className="container-site flex min-h-full flex-col py-8">
          <ul className="flex flex-col">
            <li>
              <NavLink to="/" end className="block border-b border-white/10 py-4 font-serif text-3xl">
                Início
              </NavLink>
            </li>
            {MENU.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `block border-b border-white/10 py-4 font-serif text-3xl ${isActive ? 'text-white' : 'text-marinho-100'}`
                  }
                >
                  {item.nome}
                </NavLink>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-col gap-3">
            <Link to="/contato" className={botao('claro', 'lg')}>
              Solicitar orçamento
            </Link>
            <BotaoWhatsApp origem="menu-movel" tamanho="lg" />
          </div>
        </nav>
      </div>
    </header>
  )
}

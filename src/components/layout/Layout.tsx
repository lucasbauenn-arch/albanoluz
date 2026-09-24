import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router'
import { registrarPagina } from '../../lib/analytics'
import { AvisoCookies } from './AvisoCookies'
import { Cabecalho } from './Cabecalho'
import { Rodape } from './Rodape'
import { WhatsAppFlutuante } from './WhatsAppFlutuante'

export function Layout() {
  const { pathname, hash } = useLocation()
  const primeira = useRef(true)

  useEffect(() => {
    if (primeira.current) {
      primeira.current = false
      return
    }
    if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView()
    else window.scrollTo(0, 0)
    registrarPagina(pathname)
  }, [pathname, hash])

  return (
    <>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:bg-marinho focus:px-4 focus:py-2 focus:text-white"
      >
        Pular para o conteúdo
      </a>
      <Cabecalho />
      <main id="conteudo" tabIndex={-1} className="outline-none">
        <Outlet />
      </main>
      <Rodape />
      <WhatsAppFlutuante />
      <AvisoCookies />
    </>
  )
}

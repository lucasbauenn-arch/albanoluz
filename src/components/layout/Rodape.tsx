import { Mail, MapPin } from 'lucide-react'
import { Link } from 'react-router'
import { SITE, emailUrl, instagramUrl } from '../../config/site'
import { SERVICOS } from '../../data/servicos'
import { abrirPreferenciasCookies } from '../../lib/consentimento'
import { BotaoWhatsApp } from '../BotaoWhatsApp'
import { IconeInstagram, IconeWhatsApp } from '../ui/IconesMarca'
import { Logo } from '../ui/Logo'
import { MENU } from './Cabecalho'

export function Rodape() {
  const ano = new Date().getFullYear()
  return (
    <footer className="tema-escuro bg-marinho-950 text-marinho-100">
      <div className="container-site grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
        <div>
          <Link to="/" aria-label={`${SITE.nome}, página inicial`} className="inline-block">
            <Logo claro />
          </Link>
          <p className="mt-6 max-w-xs text-[0.95rem] leading-relaxed">
            Cálculo estrutural e projetos complementares com segurança e economia. Há mais de {SITE.anosMercado} anos
            ao lado de arquitetos e construtoras.
          </p>
          <BotaoWhatsApp origem="rodape" tamanho="sm" className="mt-6" />
        </div>

        <nav aria-labelledby="rodape-navegacao">
          <h2 id="rodape-navegacao" className="font-sans text-sm font-semibold tracking-[0.14em] text-white">
            Navegação
          </h2>
          <ul className="mt-5 space-y-2.5 text-[0.95rem]">
            <li>
              <Link to="/" className="hover:text-white hover:underline">
                Início
              </Link>
            </li>
            {MENU.map((item) => (
              <li key={item.path}>
                <Link to={item.path} className="hover:text-white hover:underline">
                  {item.nome}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="rodape-servicos">
          <h2 id="rodape-servicos" className="font-sans text-sm font-semibold tracking-[0.14em] text-white">
            Serviços
          </h2>
          <ul className="mt-5 space-y-2.5 text-[0.95rem]">
            {SERVICOS.map((s) => (
              <li key={s.slug}>
                <Link to={`/servicos/${s.slug}`} className="hover:text-white hover:underline">
                  {s.nomeCurto}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="font-sans text-sm font-semibold tracking-[0.14em] text-white">Contato</h2>
          <ul className="mt-5 space-y-3.5 text-[0.95rem]">
            <li>
              <a
                href={`https://wa.me/${SITE.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 hover:text-white"
              >
                <IconeWhatsApp className="size-5 shrink-0" />
                {SITE.whatsappExibicao}
              </a>
            </li>
            <li>
              <a href={emailUrl} className="flex items-center gap-3 break-all hover:text-white">
                <Mail aria-hidden="true" className="size-5 shrink-0" />
                {SITE.email}
              </a>
            </li>
            <li>
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 hover:text-white"
              >
                <IconeInstagram className="size-5 shrink-0" />@{SITE.instagram}
              </a>
            </li>
            <li className="flex items-center gap-3">
              <MapPin aria-hidden="true" className="size-5 shrink-0" />
              {SITE.areaAtendida}
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-site flex flex-col gap-3 py-6 text-sm text-marinho-200 md:flex-row md:items-center md:justify-between">
          <p suppressHydrationWarning>
            © {ano} {SITE.nome}
            {SITE.cnpj && <> · CNPJ {SITE.cnpj}</>}
            {SITE.responsavel.crea && <> · CREA {SITE.responsavel.crea}</>}
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link to="/politica-de-privacidade" className="hover:text-white hover:underline">
              Política de privacidade
            </Link>
            <button type="button" onClick={abrirPreferenciasCookies} className="text-left hover:text-white hover:underline">
              Preferências de cookies
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}

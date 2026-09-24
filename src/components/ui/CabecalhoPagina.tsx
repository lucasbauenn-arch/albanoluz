import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

export interface ItemTrilha {
  nome: string
  path: string
}

interface Props {
  titulo: ReactNode
  descricao?: ReactNode
  trilha: ItemTrilha[]
  imagem?: string
  children?: ReactNode
}

/** Faixa de título em azul sólido (padrão do portfólio), com trilha de navegação. */
export function CabecalhoPagina({ titulo, descricao, trilha, imagem, children }: Props) {
  return (
    <section className="grade-tecnica tema-escuro relative overflow-hidden">
      {imagem && (
        <img
          src={imagem}
          alt=""
          aria-hidden="true"
          width={1200}
          height={900}
          className="pointer-events-none absolute top-1/2 right-[-12%] hidden w-[58%] max-w-[760px] -translate-y-1/2 opacity-[0.16] mix-blend-screen lg:block"
        />
      )}
      <div className="container-site relative py-14 sm:py-20">
        <nav aria-label="Trilha de navegação">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-marinho-200">
            {trilha.map((item, i) => {
              const ultimo = i === trilha.length - 1
              return (
                <li key={item.path} className="flex items-center gap-1.5">
                  {ultimo ? (
                    <span aria-current="page" className="text-white">
                      {item.nome}
                    </span>
                  ) : (
                    <>
                      <Link to={item.path} className="underline-offset-4 hover:text-white hover:underline">
                        {item.nome}
                      </Link>
                      <ChevronRight aria-hidden="true" className="size-3.5" />
                    </>
                  )}
                </li>
              )
            })}
          </ol>
        </nav>
        <h1 className="mt-6 max-w-4xl text-[2.6rem] text-white sm:text-6xl">{titulo}</h1>
        {descricao && <p className="mt-5 max-w-2xl text-lg text-marinho-100">{descricao}</p>}
        {children}
      </div>
    </section>
  )
}

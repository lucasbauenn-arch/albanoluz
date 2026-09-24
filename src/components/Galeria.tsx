import { ChevronLeft, ChevronRight, Expand, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { srcSetDe } from '../data/fotos'
import type { Foto } from '../types'

interface LightboxProps {
  fotos: Foto[]
  indice: number | null
  aoMudar: (i: number) => void
  aoFechar: () => void
}

/** Visualizador em tela cheia com <dialog> nativo: foco preso, Esc fecha, setas navegam. */
export function Lightbox({ fotos, indice, aoMudar, aoFechar }: LightboxProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const aberto = indice !== null
  const total = fotos.length

  // O estado do React manda no diálogo; o evento nativo "close" é só um reforço.
  useEffect(() => {
    const dlg = ref.current
    if (!dlg) return
    if (!aberto) {
      if (dlg.open) dlg.close()
      return
    }
    if (!dlg.open) dlg.showModal()
    const html = document.documentElement
    html.style.overflow = 'hidden'
    return () => {
      html.style.overflow = ''
    }
  }, [aberto])

  useEffect(() => {
    if (!aberto) return
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        aoFechar()
      }
      if (e.key === 'ArrowRight') aoMudar(((indice ?? 0) + 1) % total)
      if (e.key === 'ArrowLeft') aoMudar(((indice ?? 0) - 1 + total) % total)
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [aberto, indice, total, aoMudar, aoFechar])

  const foto = indice !== null ? fotos[indice] : null

  return (
    <dialog
      ref={ref}
      aria-label="Galeria de imagens"
      onCancel={(e) => {
        e.preventDefault()
        aoFechar()
      }}
      onClose={() => aberto && aoFechar()}
      onClick={(e) => {
        if (e.target === e.currentTarget) aoFechar()
      }}
      className="m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-0 backdrop:bg-marinho-950/95"
    >
      {foto && (
        <div className="tema-escuro flex h-full flex-col" onClick={(e) => e.target === e.currentTarget && aoFechar()}>
          <div className="flex items-center justify-between px-4 py-3 text-sm text-marinho-100 sm:px-6">
            <p aria-live="polite">
              {indice! + 1} de {total}
            </p>
            <button
              type="button"
              onClick={aoFechar}
              className="inline-flex size-11 items-center justify-center text-white hover:bg-white/10"
            >
              <X aria-hidden="true" className="size-6" />
              <span className="sr-only">Fechar galeria</span>
            </button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 sm:px-20">
            <figure className="flex max-h-full flex-col items-center">
              <img
                src={foto.url}
                alt={foto.alt}
                className="max-h-[calc(100dvh-10rem)] w-auto max-w-full bg-white object-contain"
              />
              <figcaption className="mt-3 max-w-3xl text-center text-sm text-marinho-100">
                {foto.legenda || foto.alt}
              </figcaption>
            </figure>
            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => aoMudar((indice! - 1 + total) % total)}
                  className="absolute top-1/2 left-2 inline-flex size-12 -translate-y-1/2 items-center justify-center bg-marinho/80 text-white hover:bg-marinho sm:left-5"
                >
                  <ChevronLeft aria-hidden="true" className="size-6" />
                  <span className="sr-only">Imagem anterior</span>
                </button>
                <button
                  type="button"
                  onClick={() => aoMudar((indice! + 1) % total)}
                  className="absolute top-1/2 right-2 inline-flex size-12 -translate-y-1/2 items-center justify-center bg-marinho/80 text-white hover:bg-marinho sm:right-5"
                >
                  <ChevronRight aria-hidden="true" className="size-6" />
                  <span className="sr-only">Próxima imagem</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </dialog>
  )
}

interface GaleriaProps {
  fotos: Foto[]
  colunas?: string
}

/** Grade de miniaturas que abre o lightbox. */
export function Galeria({ fotos, colunas = 'sm:grid-cols-2 lg:grid-cols-3' }: GaleriaProps) {
  const [indice, setIndice] = useState<number | null>(null)
  return (
    <>
      <ul className={`grid gap-5 ${colunas}`}>
        {fotos.map((foto, i) => (
          <li key={`${foto.url}-${i}`}>
            <button
              type="button"
              onClick={() => setIndice(i)}
              className="group relative block w-full border border-marinho/15 bg-white p-1.5 text-left transition-shadow hover:shadow-[8px_8px_0_0_var(--color-marinho)]"
            >
              <img
                src={foto.url}
                srcSet={srcSetDe(foto.url)}
                sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
                alt={foto.alt}
                width={1200}
                height={900}
                loading="lazy"
                decoding="async"
                className="aspect-[4/3] w-full object-cover"
              />
              <span className="absolute right-3 bottom-3 inline-flex size-9 items-center justify-center bg-marinho text-white opacity-90 transition-opacity group-hover:opacity-100">
                <Expand aria-hidden="true" className="size-4" />
              </span>
              <span className="sr-only">Ampliar imagem</span>
            </button>
          </li>
        ))}
      </ul>
      <Lightbox fotos={fotos} indice={indice} aoMudar={setIndice} aoFechar={() => setIndice(null)} />
    </>
  )
}

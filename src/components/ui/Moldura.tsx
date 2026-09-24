import { srcSetDe } from '../../data/fotos'
import type { Foto } from '../../types'

interface Props {
  foto: Foto
  className?: string
  prioridade?: boolean
  escuro?: boolean
  mostrarLegenda?: boolean
}

/** Imagem em moldura fina com sombra deslocada (padrão do portfólio). */
export function Moldura({ foto, className = '', prioridade, escuro, mostrarLegenda }: Props) {
  return (
    <figure className={className}>
      <div
        className={`border p-2 ${
          escuro ? 'border-white/25 bg-white/5 sombra-deslocada-clara' : 'border-marinho/25 bg-white sombra-deslocada'
        }`}
      >
        <img
          src={foto.url}
          srcSet={srcSetDe(foto.url)}
          sizes="(min-width: 1024px) 50vw, 100vw"
          alt={foto.alt}
          width={1200}
          height={900}
          loading={prioridade ? 'eager' : 'lazy'}
          fetchPriority={prioridade ? 'high' : undefined}
          decoding="async"
          className="block h-auto w-full"
        />
      </div>
      {mostrarLegenda && foto.legenda && (
        <figcaption className={`mt-5 text-sm ${escuro ? 'text-marinho-200' : 'text-grafite'}`}>{foto.legenda}</figcaption>
      )}
    </figure>
  )
}

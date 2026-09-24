import { Link } from 'react-router'
import { srcSetDe } from '../data/fotos'
import { nomeServico } from '../data/servicos'
import { CATEGORIA_LABEL, TIPO_LABEL, type Obra } from '../types'

export function SeloObra({ obra }: { obra: Obra }) {
  if (obra.categoria === 'andamento') {
    return (
      <span className="inline-flex items-center gap-1.5 bg-marinho px-2.5 py-1 text-xs font-semibold text-white">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-amber-300" />
        Em andamento{obra.ano ? ` — ${obra.ano}` : ''}
      </span>
    )
  }
  if (obra.categoria === 'realizada') return null
  return (
    <span className="inline-flex bg-white/95 px-2.5 py-1 text-xs font-semibold text-marinho">
      {CATEGORIA_LABEL[obra.categoria]}
    </span>
  )
}

export function metaObra(obra: Obra) {
  return [TIPO_LABEL[obra.tipo], obra.cidade, obra.ano].filter(Boolean).join(' · ')
}

export function ObraCard({ obra, nivel = 'h3' }: { obra: Obra; nivel?: 'h2' | 'h3' }) {
  const Titulo = nivel
  return (
    <article className="group relative flex flex-col border border-marinho/10 bg-white transition-shadow duration-300 hover:shadow-[10px_10px_0_0_var(--color-marinho)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-concreto-claro">
        <img
          src={obra.capa.url}
          srcSet={srcSetDe(obra.capa.url)}
          sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
          alt={obra.capa.alt}
          width={1200}
          height={900}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute top-3 left-3">
          <SeloObra obra={obra} />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-sm text-grafite">{metaObra(obra)}</p>
        <Titulo className="mt-1.5 text-2xl text-marinho">
          <Link to={`/portfolio/${obra.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none after:focus-visible:outline-2 after:focus-visible:outline-marinho">
            {obra.titulo}
          </Link>
        </Titulo>
        {obra.servicos.length > 0 && (
          <ul aria-label="Serviços prestados" className="mt-4 flex flex-wrap gap-1.5">
            {obra.servicos.map((s) => (
              <li key={s} className="border border-marinho/15 px-2 py-0.5 text-xs font-medium text-marinho-600">
                {nomeServico(s)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  )
}

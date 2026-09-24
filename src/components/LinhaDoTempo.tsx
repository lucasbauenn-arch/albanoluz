import { ETAPAS } from '../data/conteudo'

/** Etapas do método de trabalho (p. 9 do portfólio). */
export function LinhaDoTempo({ escuro = false }: { escuro?: boolean }) {
  return (
    <ol className="relative grid gap-10 lg:grid-cols-5 lg:gap-6">
      <span
        aria-hidden="true"
        className={`absolute top-6 bottom-6 left-6 w-px lg:top-6 lg:right-[10%] lg:bottom-auto lg:left-[10%] lg:h-px lg:w-auto ${
          escuro ? 'bg-white/25' : 'bg-marinho/25'
        }`}
      />
      {ETAPAS.map((etapa, i) => (
        <li key={etapa.titulo} className="relative flex gap-5 lg:flex-col lg:items-center lg:text-center">
          <span
            className={`relative z-10 flex size-12 shrink-0 items-center justify-center border font-serif text-xl font-semibold ${
              escuro ? 'border-white/40 bg-marinho text-white' : 'border-marinho bg-concreto-claro text-marinho'
            }`}
          >
            {String(i + 1).padStart(2, '0')}
          </span>
          <div>
            <h3 className={`text-2xl ${escuro ? 'text-white' : 'text-marinho'}`}>{etapa.titulo}</h3>
            <p className={`mt-2 text-[0.95rem] ${escuro ? 'text-marinho-100' : 'text-grafite'}`}>{etapa.texto}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}

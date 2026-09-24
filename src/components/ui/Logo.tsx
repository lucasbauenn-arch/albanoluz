interface MonogramaProps {
  className?: string
}

/** Monograma AL em moldura dupla (mesma geometria de public/favicon.svg). */
export function Monograma({ className = 'size-11' }: MonogramaProps) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={className}>
      <rect width="100" height="100" fill="#0F2344" />
      <g fill="none" stroke="#fff">
        <rect x="6" y="6" width="88" height="88" strokeWidth="3" />
        <rect x="12" y="12" width="76" height="76" strokeWidth="1.2" />
      </g>
      <g fill="#fff">
        <polygon points="36.5,24 39,24 23.5,74 21,74" />
        <polygon points="37,24 40,24 55,74 46,74" />
        <rect x="28" y="55" width="16" height="2.5" />
        <rect x="17" y="73.5" width="12" height="2.5" />
        <rect x="43" y="73.5" width="15" height="2.5" />
        <rect x="60" y="26" width="8" height="50" />
        <rect x="56" y="24" width="16" height="2.5" />
        <rect x="56" y="73.5" width="6" height="2.5" />
        <rect x="60" y="72" width="24" height="4" />
        <rect x="81.5" y="65" width="2.5" height="11" />
      </g>
    </svg>
  )
}

export function Logo({ claro = false }: { claro?: boolean }) {
  return (
    <span className="flex items-center gap-3">
      <Monograma className="size-10 shrink-0 sm:size-11" />
      <span className="flex flex-col leading-none">
        <span className={`font-serif text-[1.3rem] font-semibold tracking-[0.14em] ${claro ? 'text-white' : 'text-marinho'}`}>
          ALBANO LUZ
        </span>
        <span className={`mt-1 text-[0.6rem] font-semibold tracking-[0.42em] ${claro ? 'text-marinho-200' : 'text-grafite'}`}>
          ENGENHARIA
        </span>
      </span>
    </span>
  )
}

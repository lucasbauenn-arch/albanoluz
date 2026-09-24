import { MoveHorizontal } from 'lucide-react'
import { useId, useState } from 'react'
import type { Foto } from '../types'

interface Props {
  antes: Foto
  depois: Foto
  rotuloAntes?: string
  rotuloDepois?: string
}

/** Comparativo modelagem → renderização com controle deslizante acessível (teclado e toque). */
export function AntesDepois({ antes, depois, rotuloAntes = 'Modelagem 3D', rotuloDepois = 'Renderização' }: Props) {
  const [pos, setPos] = useState(50)
  const id = useId()
  return (
    <figure>
      <div className="relative aspect-[4/3] overflow-hidden border border-marinho/25 bg-white select-none sombra-deslocada has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-4 has-[input:focus-visible]:outline-marinho">
        <img src={depois.url} alt={depois.alt} width={1200} height={900} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        <img
          src={antes.url}
          alt={antes.alt}
          width={1200}
          height={900}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-0.5 bg-white shadow-[0_0_0_1px_rgb(15_35_68/0.35)]" style={{ left: `${pos}%` }}>
          <span className="absolute top-1/2 left-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-marinho text-white shadow-lg">
            <MoveHorizontal className="size-5" />
          </span>
        </div>
        <span className="pointer-events-none absolute top-3 left-3 bg-marinho px-2.5 py-1 text-xs font-semibold text-white">{rotuloAntes}</span>
        <span className="pointer-events-none absolute top-3 right-3 bg-white px-2.5 py-1 text-xs font-semibold text-marinho">{rotuloDepois}</span>
        <label htmlFor={id} className="sr-only">
          Comparar {rotuloAntes.toLowerCase()} e {rotuloDepois.toLowerCase()}
        </label>
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          aria-valuetext={`${pos}% ${rotuloAntes}`}
          className="absolute inset-0 h-full w-full cursor-ew-resize appearance-none opacity-0"
        />
      </div>
      <figcaption className="mt-6 text-sm text-grafite">Arraste para comparar a modelagem com a imagem final renderizada.</figcaption>
    </figure>
  )
}

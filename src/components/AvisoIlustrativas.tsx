import { Info } from 'lucide-react'

/**
 * Aviso discreto para obras ilustrativas (ver `ehIlustrativa` em src/data/fotos.ts).
 * `unica` ajusta o texto para a página de uma obra.
 */
export function AvisoIlustrativas({ unica, className = '' }: { unica?: boolean; className?: string }) {
  return (
    <p className={`flex items-start gap-2 border-l-2 border-marinho-400 bg-white/70 px-4 py-3 text-sm text-grafite ${className}`}>
      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-marinho" />
      {unica
        ? 'Obra e imagens ilustrativas. As fotos e os dados reais serão publicados em breve.'
        : 'Obras e imagens ilustrativas. As fotos e os dados reais de cada obra serão publicados em breve.'}
    </p>
  )
}

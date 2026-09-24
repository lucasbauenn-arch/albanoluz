import { cx } from './util'

export const classeInput =
  'mt-1 block w-full rounded-md border border-concreto-escuro bg-white px-3 py-2 text-base text-tinta shadow-xs ' +
  'placeholder:text-grafite/60 focus-visible:border-marinho-600 focus-visible:outline-offset-1 ' +
  'disabled:bg-concreto-claro disabled:text-grafite aria-invalid:border-red-700 sm:text-sm'

export const classeLabel = 'block text-sm font-medium text-tinta'

export type VarianteBotao = 'primario' | 'secundario' | 'perigo' | 'fantasma'
export type TamanhoBotao = 'sm' | 'md'

const VARIANTES: Record<VarianteBotao, string> = {
  primario: 'bg-marinho text-white hover:bg-marinho-600 active:bg-marinho-900',
  secundario: 'border border-concreto-escuro bg-white text-marinho hover:bg-marinho-50',
  perigo: 'border border-red-200 bg-white text-red-800 hover:bg-red-50',
  fantasma: 'text-marinho hover:bg-marinho-50',
}

const TAMANHOS: Record<TamanhoBotao, string> = {
  sm: 'min-h-9 px-3 text-sm',
  md: 'min-h-11 px-4 text-sm',
}

export function classeBotao(variante: VarianteBotao = 'primario', tamanho: TamanhoBotao = 'md', extra?: string) {
  return cx(
    'inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60',
    VARIANTES[variante],
    TAMANHOS[tamanho],
    extra,
  )
}
